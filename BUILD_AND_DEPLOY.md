# 构建并部署 Docker Image 到 Docker Hub

本文档详细说明如何将项目构建成 Docker image 并推送到 Docker Hub，以便在 CLAW-CLOUD 上部署。

## 📋 前置要求

### 1. 安装 Docker Desktop

#### Windows 用户：
1. 访问：https://www.docker.com/products/docker-desktop/
2. 下载并安装 Docker Desktop for Windows
3. 安装后启动 Docker Desktop
4. 等待 Docker 状态变为 "Docker Desktop is running"
5. 打开命令行/PowerShell，验证安装：
   ```bash
   docker --version
   ```

#### 安装提示：
- 安装需要管理员权限
- 安装后需要重启计算机
- 确保 WSL 2 已启用（Docker Desktop 会提示）

### 2. 注册 Docker Hub 账户

1. 访问：https://hub.docker.com/
2. 点击 "Sign Up" 注册账户
3. 记住你的用户名和密码

---

## 🚀 构建和推送步骤

### 步骤 1：登录 Docker Hub

打开 PowerShell 或命令行，执行：

```bash
docker login
```

输入你的 Docker Hub 用户名和密码。

### 步骤 2：构建 Docker Image

在 `gemini-rotator` 目录下执行：

```bash
cd gemini-rotator
docker build -t otakucat2020/gemini-rotator:latest .
```

**说明：**
- `otakucat2020` 替换为你的 Docker Hub 用户名
- `gemini-rotator` 是镜像名称
- `:latest` 是标签（版本）
- `.` 表示使用当前目录的 Dockerfile

**构建时间：** 约 2-5 分钟（取决于网络速度）

### 步骤 3：验证 Image 已构建

```bash
docker images
```

你应该能看到：
```
otakucat2020/gemini-rotator   latest   <image-id>   <time>   <size>
```

### 步骤 4：推送到 Docker Hub

```bash
docker push otakucat2020/gemini-rotator:latest
```

**推送时间：** 约 2-10 分钟（取决于网络速度和镜像大小）

### 步骤 5：验证推送成功

访问：https://hub.docker.com/r/otakucat2020/gemini-rotator

你应该能看到你的镜像已经上传成功。

---

## 📦 在 CLAW-CLOUD 部署

### 基本配置

在 CLAW-CLOUD 部署页面填写：

1. **Docker Image**：
   ```
   otakucat2020/gemini-rotator:latest
   ```
   替换为你的 Docker Hub 用户名

2. **Container Name**：
   ```
   gemini-rotator
   ```

3. **Port Mapping**：
   - 主机端口：`7860`
   - 容器端口：`7860`

### 环境变量（ENVIRONMENT VARIABLES）

**可选配置**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | `7860` | 服务端口（默认 7860） |
| `NODE_ENV` | `production` | 运行环境（生产环境） |

**注意：** 如果使用默认值（端口 7860），可以不填写环境变量。

### 卷挂载（Volume Mounts）

**重要！** 必须挂载 `keys.txt` 文件。

#### 方法一：直接挂载文件

1. 准备 `keys.txt` 文件：
   ```bash
   # 每行一个 Gemini API Key
   AIzaSyABC123...
   AIzaSyDEF456...
   AIzaSyGHI789...
   ```

2. 在 CLAW-CLOUD 上配置卷挂载：
   - 主机路径：`/path/to/your/keys.txt`（上传后的路径）
   - 容器路径：`/app/keys.txt`
   - 权限：`Read-Only (ro)`

#### 方法二：挂载目录

1. 在 CLAW-CLOUD 服务器上创建目录：
   ```bash
   mkdir -p /app/config
   ```

2. 上传 `keys.txt` 到该目录

3. 配置卷挂载：
   - 主机路径：`/app/config`
   - 容器路径：`/app`
   - 权限：`Read-Only (ro)`

---

## 🔧 验证部署

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
  "timestamp": "2024-12-30T...",
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

## ⚠️ 常见问题

### 问题 1：Docker 构建失败

**错误：** `error during connect`

**解决方案：**
1. 确认 Docker Desktop 正在运行
2. 检查网络连接
3. 重启 Docker Desktop

### 问题 2：Docker push 失败

**错误：** `denied: requested access to the resource is denied`

**解决方案：**
1. 重新登录 Docker Hub：`docker login`
2. 确认镜像名称格式正确：`username/image:tag`
3. 确认 Docker Hub 仓库名称正确

### 问题 3：CLAW-CLOUD 部署后无法启动

**错误：** `keys.txt file not found`

**解决方案：**
1. 确认 `keys.txt` 文件已上传
2. 确认卷挂载路径正确
3. 检查文件权限

### 问题 4：所有 API Key 都不可用

**解决方案：**
1. 检查 `keys.txt` 中的 Key 是否有效
2. 查看 CLAW-CLOUD 容器日志
3. 使用重置端点：
   ```bash
   curl -X POST http://your-url:7860/admin/reset-keys
   ```

---

## 📝 完整命令参考

```bash
# 1. 登录 Docker Hub
docker login

# 2. 构建镜像
cd gemini-rotator
docker build -t otakucat2020/gemini-rotator:latest .

# 3. 查看镜像
docker images

# 4. 推送镜像
docker push otakucat2020/gemini-rotator:latest

# 5. 本地测试（可选）
docker run -d -p 7860:7860 -v $(pwd)/keys.txt:/app/keys.txt:ro otakucat2020/gemini-rotator:latest

# 6. 停止测试容器
docker stop $(docker ps -q --filter ancestor=otakucat2020/gemini-rotator:latest)

# 7. 清理未使用的镜像（可选）
docker image prune
```

---

## 🔄 更新镜像

如果需要更新代码：

```bash
# 1. 修改代码
# 2. 重新构建
docker build -t otakucat2020/gemini-rotator:latest .

# 3. 推送新版本
docker push otakucat2020/gemini-rotator:latest

# 4. 在 CLAW-CLOUD 重新拉取并重启容器
```

或者使用版本标签：

```bash
# 构建带版本标签的镜像
docker build -t otakucat2020/gemini-rotator:v1.0.1 .
docker push otakucat2020/gemini-rotator:v1.0.1

# 在 CLAW-CLOUD 使用：otakucat2020/gemini-rotator:v1.0.1
```

---

## 📚 相关文档

- **README.md** - 项目使用说明
- **DEPLOY.md** - CLAW-CLOUD 部署指南
- **Docker Hub 文档** - https://docs.docker.com/docker-hub/

---

**祝部署顺利！** 🚀
