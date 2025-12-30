const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ModelDetector = require('./modelDetector');
const FormatConverter = require('./formatConverter');
const KeyRotator = require('./keyRotator');

const app = express();
const PORT = process.env.PORT || 7860;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 加载API Keys
function loadApiKeys() {
  const keysPath = path.join(__dirname, 'keys.txt');
  
  if (!fs.existsSync(keysPath)) {
    console.error('[ERROR] keys.txt 文件不存在！');
    console.error('[ERROR] 请创建 keys.txt 文件，每行放入一个 Gemini API Key');
    process.exit(1);
  }
  
  const content = fs.readFileSync(keysPath, 'utf-8');
  const keys = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
  
  if (keys.length === 0) {
    console.error('[ERROR] keys.txt 中没有找到有效的 API Key');
    process.exit(1);
  }
  
  console.log(`[INFO] 已加载 ${keys.length} 个 API Key`);
  return keys;
}

// 初始化组件
const apiKeys = loadApiKeys();
const modelDetector = new ModelDetector(apiKeys);
const keyRotator = new KeyRotator(apiKeys);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    totalKeys: keyRotator.getTotalCount(),
    availableKeys: keyRotator.getAvailableCount()
  });
});

// 状态查询端点
app.get('/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    totalKeys: keyRotator.getTotalCount(),
    availableKeys: keyRotator.getAvailableCount(),
    keys: keyRotator.getStatus()
  });
});

// 获取模型列表
app.get('/v1/models', async (req, res) => {
  try {
    console.log('[API] GET /v1/models');
    const models = await modelDetector.getModels();
    res.json({
      object: 'list',
      data: models
    });
  } catch (error) {
    console.error('[ERROR] 获取模型列表失败:', error.message);
    res.status(500).json({
      error: {
        message: 'Failed to fetch models',
        type: 'api_error',
        details: error.message
      }
    });
  }
});

// 聊天完成端点
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const startTime = Date.now();
    const { model, messages, stream, ...rest } = req.body;
    
    console.log(`[API] POST /v1/chat/completions - Model: ${model}`);
    console.log(`[API] Messages count: ${messages.length}, Stream: ${stream || false}`);
    
    // 检测模型版本
    const version = modelDetector.detectVersion(model);
    console.log(`[API] Detected version: ${version}`);
    
    // 构建Gemini请求
    const openaiReq = { model, messages, ...rest };
    const geminiReq = FormatConverter.openaiToGemini(openaiReq, version);
    
    // 获取API端点
    const { apiKey } = keyRotator.getNextKey();
    const url = modelDetector.getApiEndpoint(apiKey, model);
    
    console.log(`[API] 发送请求到 Gemini API: ${model}`);
    
    // 发送请求（带重试）
    const geminiRes = await keyRotator.sendRequest(url, geminiReq, model);
    
    // 转换响应
    const openaiRes = FormatConverter.geminiToOpenAI(geminiRes, model);
    
    const duration = Date.now() - startTime;
    console.log(`[API] 请求完成，耗时: ${duration}ms, Tokens: ${openaiRes.usage.total_tokens}`);
    
    res.json(openaiRes);
    
  } catch (error) {
    console.error('[ERROR] Chat completion failed:', error.message);
    
    // 判断错误类型
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.response) {
      statusCode = error.response.status || 500;
      const geminiError = error.response.data;
      errorMessage = geminiError?.error?.message || errorMessage;
    }
    
    res.status(statusCode).json({
      error: {
        message: errorMessage,
        type: 'api_error',
        code: statusCode,
        details: error.message
      }
    });
  }
});

// 模型端点（兼容某些客户端）
app.get('/v1/models/:model', async (req, res) => {
  try {
    const modelId = req.params.model;
    console.log(`[API] GET /v1/models/${modelId}`);
    
    const models = await modelDetector.getModels();
    const model = models.find(m => m.id === modelId);
    
    if (model) {
      res.json(model);
    } else {
      res.status(404).json({
        error: {
          message: 'Model not found',
          type: 'invalid_request_error'
        }
      });
    }
  } catch (error) {
    console.error('[ERROR] Get model failed:', error.message);
    res.status(500).json({
      error: {
        message: 'Failed to fetch model',
        type: 'api_error'
      }
    });
  }
});

// 重置Key状态端点
app.post('/admin/reset-keys', (req, res) => {
  keyRotator.resetAll();
  modelDetector.clearCache();
  res.json({
    message: 'All keys have been reset',
    timestamp: new Date().toISOString()
  });
});

// 重新加载Keys端点
app.post('/admin/reload-keys', (req, res) => {
  try {
    const newKeys = loadApiKeys();
    const newRotator = new KeyRotator(newKeys);
    
    // 替换当前的rotator
    Object.assign(keyRotator, newRotator);
    
    // 更新modelDetector的keys
    modelDetector.apiKeys = newKeys;
    modelDetector.clearCache();
    
    res.json({
      message: 'Keys have been reloaded',
      timestamp: new Date().toISOString(),
      totalKeys: newKeys.length
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Failed to reload keys',
        details: error.message
      }
    });
  }
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: 'Gemini API Key Rotation Proxy',
    version: '1.0.0',
    description: 'OpenAI-compatible proxy for Gemini API with automatic key rotation',
    endpoints: {
      health: 'GET /health',
      status: 'GET /status',
      models: 'GET /v1/models',
      chat: 'POST /v1/chat/completions',
      resetKeys: 'POST /admin/reset-keys',
      reloadKeys: 'POST /admin/reload-keys'
    },
    supportedModels: [
      'gemini-3-flash-preview',
      'gemini-3-flash-thinking',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ]
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('========================================');
  console.log('Gemini API Key Rotation Proxy');
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Loaded ${apiKeys.length} API Keys`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Status: http://localhost:${PORT}/status`);
  console.log(`API endpoint: http://localhost:${PORT}/v1`);
  console.log('========================================');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[INFO] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[INFO] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
