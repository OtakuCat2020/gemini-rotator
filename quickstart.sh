#!/bin/bash

# Gemini API Key Rotation Proxy - Quick Start Script
# 此脚本帮助快速启动和测试服务

set -e

echo "=========================================="
echo "Gemini API Key Rotation Proxy - Quick Start"
echo "=========================================="
echo ""

# 检查 keys.txt 是否存在
if [ ! -f "keys.txt" ]; then
    echo "❌ keys.txt 文件不存在！"
    echo ""
    echo "请先创建 keys.txt 文件："
    echo "  cp keys.txt.example keys.txt"
    echo "  然后编辑 keys.txt，每行放入一个 Gemini API Key"
    echo ""
    exit 1
fi

# 检查 keys.txt 是否为空
if [ ! -s "keys.txt" ]; then
    echo "❌ keys.txt 文件为空！"
    echo "请编辑 keys.txt 文件，添加你的 Gemini API Keys"
    echo ""
    exit 1
fi

# 统计 keys 数量
key_count=$(grep -v '^#' keys.txt | grep -v '^$' | wc -l)
echo "✅ 找到 $key_count 个 API Key"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装！"
    echo "请先安装 Node.js 18 或更高版本"
    echo ""
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装！"
    echo "请先安装 npm"
    echo ""
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    echo ""
fi

echo "✅ 依赖已安装"
echo ""

# 启动服务
echo "🚀 启动服务..."
echo "=========================================="
echo ""

npm start
