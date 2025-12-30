# 多阶段构建 - 阶段1: 构建
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 阶段2: 运行
FROM node:18-alpine

# 安装必要的工具
RUN apk add --no-cache curl

# 设置工作目录
WORKDIR /app

# 从构建阶段复制node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制应用文件
COPY package*.json ./
COPY server.js ./
COPY modelDetector.js ./
COPY formatConverter.js ./
COPY keyRotator.js ./

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 7860

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

# 启动应用
CMD ["node", "server.js"]
