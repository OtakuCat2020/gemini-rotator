# 快速部署指南 - CLAW-CLOUD

本文档提供在 CLAW-CLOUD 上快速部署 Gemini API Key Rotation Proxy 的步骤。

## 📋 部署前准备

1. **准备你的 248 个 Gemini API Keys**
   - 创建 `keys.txt` 文件
   - 每行放入一个 API Key
   - 确保格式正确（无空行，无多余空格）

2. **准备 CLAW-CLOUD 账户**
   - 确保账户有足够的资源（$5/月预算）
   - 确认支持 Docker 容器部署

## 🚀 部署方法

### 方法一：通过 GitHub 自动部署（推荐）

#### 步骤 1: 推送代码到 GitHub

```bash
# 初始化 Git 仓库
cd gemini-rotator
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库后执行
git remote add origin https://github.com/your-username/gemini-rotator.git
git branch -M main
git push -u origin main
```

#### 步骤 2: 在 CLAW-CLOUD 部署

1. 登录 CLAW-CLOUD 控制台
2. 选择"从 GitHub 部署"
3. 授权访问你的 GitHub 账户
4. 选择 `gemini-rotator` 仓库
5. CLAW-CLOUD 会自动检测 Dockerfile 并构建镜像

#### 步骤 3: 配置容器

**基本配置：**
- 容器名称：`gemini-rotator`
- 端口映射：`7860:7860`

**卷挂载（重要）：**
- 上传你的 `keys.txt` 文件到 CLAW-CLOUD 服务器
- 配置卷挂载：
  - 主机路径：`/path/to/your/keys.txt`（上传后的路径）
  - 容器路径：`/app/keys.txt`
  - 权限：只读 (ro)

**环境变量（可选）：**
```
NODE_ENV=production
PORT=7860
```

#### 步骤 4: 启动容器

点击"部署"或"启动"按钮，等待容器启动。

#### 步骤 5: 验证部署

```bash
# 健康检查
curl http://your-claw-cloud-url:7860/health

# 查看状态
curl http://your-claw-cloud-url:7860/status

# 查看模型列表
curl http://your-claw-cloud-url:7860/v1/models
```

### 方法二：手动构建 Docker 镜像

#### 步骤 1: 本地构建镜像

```bash
cd gemini-rotator
docker build -t gemini-rotator:latest .
```

#### 步骤 2: 推送到镜像仓库

```bash
# 标记镜像（根据CLAW-CLOUD支持的仓库）
docker tag gemini-rotator:latest your-registry/gemini-rotator:latest

# 推送
docker push your-registry/gemini-rotator:latest
```

#### 步骤 3: 在 CLAW-CLOUD 使用镜像

1. 选择"使用自定义镜像"部署
2. 输入镜像地址：`your-registry/gemini-rotator:latest`
3. 配置端口和卷挂载（同方法一）
4. 启动容器

### 方法三：使用 Docker Compose

如果 CLAW-CLOUD 支持 Docker Compose：

1. 上传整个项目目录到 CLAW-CLOUD
2. 确保 `keys.txt` 在项目根目录
3. 运行：
   ```bash
   docker-compose up -d
   ```

## 🔧 配置 Cline

部署完成后，在 Cline 中配置：

1. 打开 Cline 设置
2. 找到 API 配置部分
3. 填写以下信息：

```
API Base URL: http://your-claw-cloud-url:7860/v1
API Key: any-string (任意填写，代理不验证)
Model: gemini-3-flash-preview
```

4. 保存配置
5. 开始使用！

## 📊 监控和管理

### 查看日志

```bash
# 通过 CLAW-CLOUD 控制台查看容器日志
# 或使用 SSH 连接到服务器后执行：
docker logs -f gemini-rotator
```

### 更新 API Keys

如果需要更新 keys.txt：

1. 准备新的 keys.txt 文件
2. 上传到 CLAW-CLOUD 服务器
3. 重启容器以加载新的 keys：
   ```bash
   docker restart gemini-rotator
   ```
4. 或者使用 API 端点重新加载：
   ```bash
   curl -X POST http://your-claw-cloud-url:7860/admin/reload-keys
   ```

### 检查 Key 状态

```bash
curl http://your-claw-cloud-url:7860/status | jq
```

这会显示所有 Key 的使用状态，包括：
- 总 Key 数量
- 可用 Key 数量
- 每个 Key 的失败次数
- 最后使用时间

### 重置 Key 状态

如果所有 Key 都被标记为不可用，可以重置：

```bash
curl -X POST http://your-claw-cloud-url:7860/admin/reset-keys
```

## ⚠️ 常见问题

### 问题 1: 容器启动失败

**检查步骤：**
1. 查看 CLAW-CLOUD 控制台的错误日志
2. 确认 keys.txt 文件存在且格式正确
3. 确认卷挂载路径正确
4. 检查端口 7860 是否被占用

### 问题 2: 无法连接到 API

**检查步骤：**
1. 确认容器正在运行
2. 检查防火墙设置
3. 确认端口映射正确
4. 测试健康检查端点：`curl http://your-url:7860/health`

### 问题 3: Cline 显示连接错误

**检查步骤：**
1. 确认 API Base URL 正确（必须包含 `/v1`）
2. 确认容器正在运行且健康
3. 检查网络连接
4. 查看 Cline 的错误日志

### 问题 4: 所有 Key 都不可用

**可能原因：**
- API Keys 已过期或失效
- 网络连接问题
- 超出配额限制

**解决方法：**
1. 检查 Key 是否有效
2. 重置 Key 状态：`curl -X POST http://your-url:7860/admin/reset-keys`
3. 更新 keys.txt 文件
4. 重启容器

## 📈 优化建议

1. **资源限制**
   - 根据实际使用情况调整 CPU 和内存限制
   - 建议至少 256MB 内存

2. **日志管理**
   - 配置日志轮转（已在 docker-compose.yml 中配置）
   - 定期清理旧日志

3. **监控告警**
   - 设置 Key 可用数量告警
   - 监控容器健康状态
   - 设置资源使用率告警

4. **安全加固**
   - 使用 HTTPS（配置反向代理）
   - 限制管理端点的访问
   - 定期更新 API Keys

## 🔒 安全建议

1. **保护 keys.txt**
   - 不要将 keys.txt 提交到 Git
   - 使用文件权限限制访问：`chmod 600 keys.txt`

2. **使用反向代理**
   - 在容器前部署 Nginx 或 Caddy
   - 添加 HTTPS 支持
   - 添加基本认证

3. **网络安全**
   - 使用防火墙限制访问
   - 只开放必要的端口
   - 定期更新系统

## 📞 获取帮助

如果遇到问题：

1. 查看完整的 README.md 文档
2. 检查容器日志：`docker logs gemini-rotator`
3. 访问 GitHub Issues 页面
4. 联系 CLAW-CLOUD 技术支持

---

**祝部署顺利！** 🎉
