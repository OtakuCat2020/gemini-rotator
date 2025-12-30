const axios = require('axios');

class ModelDetector {
  constructor(apiKeys) {
    this.apiKeys = apiKeys;
    this.cachedModels = null;
    this.cacheExpiry = null;
    this.cacheDuration = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 检测Gemini模型版本
   * @param {string} modelName - 模型名称
   * @returns {string} 版本类型: 'v1', 'v2', 'v3'
   */
  detectVersion(modelName) {
    if (!modelName) return 'v1';
    
    const model = modelName.toLowerCase();
    
    // Gemini 3.x 使用最新格式
    if (model.includes('gemini-3') || model.includes('thinking-')) {
      return 'v3';
    }
    
    // Gemini 2.0 Flash 使用新版格式
    if (model.includes('gemini-2.0-flash-exp') || model.includes('2.0-flash')) {
      return 'v2';
    }
    
    // Gemini 2.5 和 1.5 使用旧版格式
    if (model.includes('gemini-2.5') || model.includes('gemini-1.5')) {
      return 'v1';
    }
    
    // 默认使用旧版格式
    return 'v1';
  }

  /**
   * 获取API端点URL
   * @param {string} apiKey - API Key
   * @param {string} modelName - 模型名称
   * @returns {string} API端点URL
   */
  getApiEndpoint(apiKey, modelName) {
    const version = this.detectVersion(modelName);
    const model = modelName || 'gemini-1.5-flash';
    
    // 基础API URL
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    
    // 根据版本选择端点
    if (version === 'v3') {
      // Gemini 3 使用 models/{model}:generateContent
      return `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    } else if (version === 'v2') {
      // Gemini 2.0 Flash 使用 models/{model}:generateContent
      return `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    } else {
      // Gemini 1.5/2.5 使用 models/{model}:generateContent
      return `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    }
  }

  /**
   * 获取可用模型列表
   * @returns {Promise<Array>} 模型列表
   */
  async getModels() {
    // 检查缓存
    if (this.cachedModels && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedModels;
    }

    // 尝试从第一个可用的key获取模型列表
    for (const apiKey of this.apiKeys) {
      try {
        const response = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          {
            timeout: 10000
          }
        );

        if (response.data && response.data.models) {
          // 转换为OpenAI格式
          const models = response.data.models
            .filter(model => 
              model.name.includes('gemini') && 
              (model.name.includes('generateContent') || model.supportedGenerationMethods?.includes('generateContent'))
            )
            .map(model => ({
              id: model.name.replace('models/', ''),
              object: 'model',
              created: Math.floor(Date.now() / 1000),
              owned_by: 'google'
            }));

          this.cachedModels = models;
          this.cacheExpiry = Date.now() + this.cacheDuration;
          
          console.log(`[ModelDetector] 从API获取到 ${models.length} 个模型`);
          return models;
        }
      } catch (error) {
        console.log(`[ModelDetector] Key ${apiKey.substring(0, 10)}... 获取模型列表失败:`, error.message);
        continue;
      }
    }

    // 如果所有key都失败，返回默认模型列表
    console.log('[ModelDetector] 所有API Key都失败，返回默认模型列表');
    return this.getDefaultModels();
  }

  /**
   * 获取默认模型列表（当API不可用时）
   * @returns {Array} 默认模型列表
   */
  getDefaultModels() {
    return [
      { id: 'gemini-3-flash-preview', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-3-flash-thinking', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-2.5-pro-preview-0514', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-2.5-flash-preview-0514', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-2.5-pro', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-2.5-flash', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-2.0-flash-exp', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-1.5-pro', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-1.5-flash', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' },
      { id: 'gemini-1.5-flash-8b', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'google' }
    ];
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cachedModels = null;
    this.cacheExpiry = null;
    console.log('[ModelDetector] 缓存已清除');
  }
}

module.exports = ModelDetector;
