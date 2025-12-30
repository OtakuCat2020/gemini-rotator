# 使用 GitHub Actions 自动部署到 CLAW-CLOUD

本文档说明如何使用 GitHub Actions 自动构建 Docker image 并部署到 CLAW-CLOUD。

## ✨ 优势

使用 GitHub Actions 自动构建有以下优势：

- ✅ **无需本地安装 Docker** - 直接在 GitHub 上构建
- ✅ **免费** - GitHub Container Registry 完全免费
- ✅ **自动化** - 每次推送代码自动构建新镜像
- ✅ **快速** - 通常 2-5 分钟完成构建
- ✅ **安全** - 使用 GitHub 自带的认证，无需管理密钥

---

## 📋 前置要求

### 1. 启用 GitHub Packages

1. 访问你的 GitHub 仓库设置
2. 进入 **Settings** → **Actions** → **General**
3. 确保 **Workflow permissions** 已启用
4. 在 **Actions permissions** 中选择：
   - ✅ Read and write permissions
   - ✅ Repository permissions: All

### 2. （首次构建）手动触发构建

首次推送后，可以手动触发构建：

1. 访问 GitHub 仓库的 **Actions** 标签
2. 找到 **Build and Push Docker Image** workflow
3. 点击右侧的 **Run workflow** 按钮
4. 选择分支（main）后点击绿色的 **Run workflow** 按钮

---

## 🚀 部署步骤

### 步骤 1：确认 Docker Image 已构建

访问 GitHub Actions 页面：
```
https://github.com/OtakuCat2020/gemini-rotator/actions
```

等待 workflow 完成成（绿色 ✓ 标记），通常需要 2-5 分钟。

### 步骤 2：在 CLAW-CLOUD 部署

#### 1. 填写 Docker Image 地址

```
ghcr.io/otakucat2020/gemini-rotator:latest
```

**重要提示：**
- 用户名是 **小写** 的：`otakucat2020`（不是 OtakuCat2020）
- 仓库名是 `gemini-rotator`
- 标签是 `:latest`

#### 2. 配置端口

```
主机端口：7860
容器端口：7860
```

#### 3. 环境变量（可选）

如果使用默认值，可以不填写环境变量。

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | `7860` | 服务端口（默认 7860） |
| `NODE_ENV` | `production` | 运行环境 |

#### 4. 卷挂载（重要！）

必须挂载 `keys.txt` 文件，否则容器无法启动。

**方法一：直接挂载文件**

| 参数 | 值 |
|--------|-----|
| 主机路径 | `/path/to/your/keys.txt`（上传后的路径） |
| 容器路径 | `/app/keys.txt` |
| 权限 | Read-Only (ro) |

**方法二：挂载目录**

| 参数 | 值 |
|--------|-----|
| 主机路径 | `/app/config`（包含 keys.txt 的目录） |
| 容器路径 | `/app` |
| 权限 | Read-Only (ro) |

#### 5. 准备 keys.txt 文件

在 CLAW-CLOUD 服务器上创建 `keys.txt`：

```
AIzaSyABC123...
AIzaSyDEF456...
AIzaSyGHI789...
... (共248个或更多)
```

**格式要求：**
- 每行一个 API Key
- 不能有空行
- 不能有多余空格
- 以 `#` 开头的行会被忽略（注释）

---

## 🔍 验证部署

### 1. 检查容器状态

在 CLAW-CLOUD 控制台确认容器正在运行。

### 2. 测试健康检查

```bash
curl http://your-claw-cloud-url:7860/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-12-30T08:00:00.000Z",
  "totalKeys": 248,
  "availableKeys": 248
}
```

### 3. 测试模型列表

```bash
curl http://your-claw-cloud-url:7860/v1/models
```

### 4. 测试 API 调用

```bash
curl -X POST http://your-claw-cloud-url:7860/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3-flash-preview",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 🎯 配置 Cline

部署完成后，在 Cline 中配置：

```
API Base URL: http://your-claw-cloud-url:7860/v1
API Key: any-string (任意填写，代理不验证)
Model: gemini-3-flash-preview
```

---

## 📊 监控和管理

### 查看容器日志

在 CLAW-CLOUD 控制台查看容器日志，了解运行状态。

### 检查 Key 状态

```bash
curl http://your-claw-cloud-url:7860/status
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

### 重置 Key 状态

如果所有 Key 都被标记为不可用：

```bash
curl -X POST http://your-claw-cloud-url:7860/admin/reset-keys
```

### 重新加载 Keys

如果更新了 keys.txt 文件：

```bash
curl -X POST http://your-claw-cloud-url:7860/admin/reload-keys
```

---

## ⚠️ 常见问题

### 问题 1：容器启动失败，提示 "keys.txt not found"

**原因：** keys.txt 文件未正确挂载

**解决方案：**
1. 确认 keys.txt 文件已上传到 CLAW-CLOUD 服务器
2. 检查卷挂载配置：
   - 主机路径：实际的上传路径
   - 容器路径：`/app/keys.txt`
3. 重启容器

### 问题 2：所有 API Key 都不可用

**可能原因：**
- API Keys 已失效或过期
- 超出配额限制
- 网络连接问题

**解决方案：**
1. 检查 keys.txt 中的 Key 是否有效
2. 查看容器日志获取详细错误信息
3. 使用重置端点：`curl -X POST http://your-url:7860/admin/reset-keys`

### 问题 3：Cline 连接失败

**原因：** URL 配置错误

**解决方案：**
1. 确认 API Base URL 包含 `/v1`：
   ```
   ✅ http://your-url:7860/v1
   ❌ http://your-url:7860 (缺少 /v1)
   ```
2. 确认容器正在运行
3. 测试健康检查：`curl http://your-url:7860/health`

### 问题 4：GitHub Actions 构建失败

**原因：** Workflow 配置问题或权限不足

**解决方案：**
1. 访问 Actions 页面查看详细日志
2. 确保 Workflow permissions 已启用：
   - Settings → Actions → General
   - 勾选 "Workflow permissions"
   - 选择 "Read and write permissions"
3. 重新推送代码或手动触发 workflow

---

## 🔄 更新镜像

如果需要更新代码：

### 方法一：自动构建（推荐）

直接推送代码到 GitHub，Actions 会自动构建新镜像：

```bash
cd gemini-rotator
git add .
git commit -m "Update code"
git push
```

### 方法二：手动触发

1. 访问 GitHub 仓库的 Actions 页面
2. 找到 "Build and Push Docker Image" workflow
3. 点击 "Run workflow" 按钮

### 方法三：使用版本标签

如果想保留多个版本，可以修改 tags：

在 `.github/workflows/docker.yml` 中修改：
```yaml
tags: |
  ghcr.io/otakucat2020/gemini-rotator:latest
  ghcr.io/otakucat2020/gemini-rotator:v1.0.0
```

然后在 CLAW-CLOUD 使用：`ghcr.io/otakucat2020/gemini-rotator:v1.0.0`

---

## 📚 相关文档

- **README.md** - 项目使用说明
- **DEPLOY.md** - CLAW-CLOUD 部署指南
- **.github/workflows/docker.yml** - GitHub Actions 配置

---

## 🎉 部署流程总结

1. ✅ 代码已推送到 GitHub
2. ✅ GitHub Actions 自动构建 Docker image（2-5 分钟）
3. ✅ 镜像推送到 ghcr.io
4. ✅ 在 CLAW-CLOUD 填写镜像地址：`ghcr.io/otakucat2020/gemini-rotator:latest`
5. ✅ 配置端口：7860
6. ✅ 配置卷挂载：keys.txt
7. ✅ 启动容器
8. ✅ 在 Cline 配置使用

**注意：镜像地址中的用户名是小写的 `otakucat2020`！**

---

**祝部署顺利！** 🚀
