# Gemini API Key Rotation Proxy

一个轻量级的 Gemini API 代理服务，提供 OpenAI 兼容接口，支持自动轮询多个 API Key，适用于 Cline 等 AI 助手工具。

## ✨ 特性

- 🔄 **自动轮询** - 每次请求自动切换到下一个 API Key
- 🛡️ **智能容错** - 连续 3 次失败自动标记 Key 为不可用
- 📦 **多版本支持** - 支持 Gemini 1.5、2.5、3.0 所有版本
- 🎯 **OpenAI 兼容** - 完全兼容 OpenAI API 格式
- 🐳 **Docker 部署** - 轻量级 Alpine 镜像，易于部署
- 📊 **状态监控** - 实时查看 Key 使用状态
- 🔄 **动态模型列表** - 自动从 Gemini API 获取可用模型

## 📋 支持的模型

- `gemini-3-flash-preview` - Gemini 3 Flash 预览版
- `gemini-3-flash-thinking` - Gemini 3 Thinking 版本
- `gemini-2.5-pro` - Gemini 2.5 Pro
- `gemini-2.5-flash` - Gemini 2.5 Flash
- `gemini-2.0-flash-exp` - Gemini 2.0 Flash 实验版
- `gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini-1.5-flash` - Gemini 1.5 Flash
- 以及其他 Gemini 模型...

## 🚀 快速开始

### 1. 准备 API Keys

复制示例配置文件并填入你的 API Keys：

```bash
cp keys.txt.example keys.txt
```

编辑 `keys.txt`，每行放入一个 Gemini API Key：

```
AIzaSyABC123...
AIzaSyDEF456...
AIzaSyGHI789...
...
```

> 💡 获取 API Key：https://makersuite.google.com/app/apikey

### 2. 使用 Docker 部署

#### 构建镜像

```bash
docker build -t gemini-rotator .
```

#### 运行容器

```bash
docker run -d \
  --name gemini-rotator \
  -p 7860:7860 \
  -v $(pwd)/keys.txt:/app/keys.txt:ro \
  gemini-rotator
```

#### 使用 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  gemini-rotator:
    image: gemini-rotator
    container_name: gemini-rotator
    ports:
      - "7860:7860"
    volumes:
      - ./keys.txt:/app/keys.txt:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7860/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

启动服务：

```bash
docker-compose up -d
```

### 3. 本地开发

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

服务将在 `http://localhost:7860` 启动。

## 🌐 部署到 CLAW-CLOUD

### 方法一：直接部署 Docker 镜像

1. **构建并推送镜像**

```bash
# 构建镜像
docker build -t gemini-rotator .

# 推送到你的镜像仓库（根据CLAW-CLOUD的要求）
docker tag gemini-rotator your-registry/gemini-rotator:latest
docker push your-registry/gemini-rotator:latest
```

2. **在 CLAW-CLOUD 部署**

- 选择 Docker 容器部署方式
- 使用镜像：`your-registry/gemini-rotator:latest`
- 端口映射：`7860:7860`
- 添加卷挂载：
  - 主机路径：`/path/to/keys.txt`
  - 容器路径：`/app/keys.txt`
  - 权限：只读 (ro)

3. **配置环境变量**（可选）

```
PORT=7860
```

### 方法二：使用 Git 仓库部署

1. **创建 GitHub 仓库**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/gemini-rotator.git
git push -u origin main
```

2. **在 CLAW-CLOUD 部署**

- 选择从 GitHub 部署
- 连接你的仓库
- CLAW-CLOUD 会自动检测 Dockerfile 并构建
- 配置端口和卷挂载

3. **更新 keys.txt**

- 通过 CLAW-CLOUD 的文件管理功能上传 keys.txt
- 或者通过 SSH/终端编辑容器内的 keys.txt

### 方法三：使用 Docker Compose

在 CLAW-CLOUD 支持的情况下，可以使用 Docker Compose：

```yaml
version: '3.8'

services:
  gemini-rotator:
    build: .
    container_name: gemini-rotator
    ports:
      - "7860:7860"
    volumes:
      - ./keys.txt:/app/keys.txt:ro
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## 🔧 配置 Cline

在 Cline 中配置使用此代理：

1. 打开 Cline 设置
2. 配置以下参数：

```
API Base URL: http://your-claw-cloud-url:7860/v1
API Key: any-string (代理不验证，任意填写即可)
Model: gemini-3-flash-preview (或其他支持的模型)
```

3. 保存配置并开始使用

## 📡 API 端点

### 健康检查

```bash
GET /health
```

响应示例：
```json
{
  "status": "healthy",
  "timestamp": "2024-12-30T08:00:00.000Z",
  "totalKeys": 248,
  "availableKeys": 245
}
```

### 状态查询

```bash
GET /status
```

响应示例：
```json
{
  "timestamp": "2024-12-30T08:00:00.000Z",
  "totalKeys": 248,
  "availableKeys": 245,
  "keys": [
    {
      "index": 0,
      "key": "AIzaSyABC...",
      "failureCount": 0,
      "isAvailable": true,
      "lastUsed": "2024-12-30T07:55:00.000Z"
    }
  ]
}
```

### 获取模型列表

```bash
GET /v1/models
```

响应示例：
```json
{
  "object": "list",
  "data": [
    {
      "id": "gemini-3-flash-preview",
      "object": "model",
      "created": 1735536000,
      "owned_by": "google"
    }
  ]
}
```

### 聊天完成（OpenAI 兼容）

```bash
POST /v1/chat/completions
```

请求示例：
```json
{
  "model": "gemini-3-flash-preview",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048
}
```

响应示例：
```json
{
  "id": "chatcmpl-1234567890abcdef",
  "object": "chat.completion",
  "created": 1735536000,
  "model": "gemini-3-flash-preview",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I'm doing well, thank you! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### 管理端点

#### 重置所有 Key 状态

```bash
POST /admin/reset-keys
```

#### 重新加载 Keys

```bash
POST /admin/reload-keys
```

> ⚠️ 注意：管理端点在生产环境中应该通过防火墙或认证保护

## 🔍 监控和日志

### 查看日志

```bash
# Docker 容器日志
docker logs -f gemini-rotator

# Docker Compose 日志
docker-compose logs -f
```

### 监控 Key 状态

```bash
curl http://localhost:7860/status | jq
```

## 🛠️ 故障排除

### 问题：服务无法启动

**原因：** `keys.txt` 文件不存在或格式错误

**解决方案：**
```bash
# 检查文件是否存在
ls -la keys.txt

# 查看文件内容
cat keys.txt

# 确保每行一个 Key，没有多余的空行
```

### 问题：所有 Key 都不可用

**原因：** 可能是网络问题或 Key 已失效

**解决方案：**
```bash
# 查看状态
curl http://localhost:7860/status

# 重置所有 Key 状态
curl -X POST http://localhost:7860/admin/reset-keys

# 重新加载 Keys（如果更新了文件）
curl -X POST http://localhost:7860/admin/reload-keys
```

### 问题：Cline 连接失败

**原因：** 端口或 URL 配置错误

**解决方案：**
1. 确认服务正在运行：`curl http://localhost:7860/health`
2. 检查防火墙设置
3. 确认 Cline 中的 API Base URL 正确（包含 `/v1`）

### 问题：模型列表为空

**原因：** API Key 无效或网络问题

**解决方案：**
1. 检查 API Key 是否有效
2. 检查网络连接
3. 查看服务日志获取详细错误信息

## 📝 性能优化建议

1. **使用 CDN**：如果部署在云端，考虑使用 CDN 加速访问
2. **负载均衡**：对于高并发场景，可以部署多个实例并使用负载均衡
3. **监控告警**：设置 Key 可用数量告警，及时补充新 Key
4. **日志管理**：配置日志轮转，避免磁盘占满

## 🔒 安全建议

1. **保护 keys.txt**：不要将 keys.txt 提交到版本控制
2. **访问控制**：在生产环境中使用反向代理（如 Nginx）添加认证
3. **HTTPS**：在生产环境中使用 SSL/TLS 加密
4. **限制访问**：通过防火墙限制管理端点的访问
5. **定期更新**：定期更新 API Key，移除失效的 Key

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过 GitHub Issues 联系。

---

**享受使用 Gemini API Key Rotation Proxy！** 🎉
