#!/bin/bash
# 差旅管理平台 - 一键部署脚本
# 部署到服务器 116.62.135.182:5002

set -e

SERVER="116.62.135.182"
REMOTE_DIR="/opt/travel-platform"

echo "🚀 差旅管理平台部署脚本"
echo "=========================="
echo ""

# 1. 创建远程目录
echo ">>> [1/4] 连接服务器并创建目录..."
ssh root@${SERVER} "mkdir -p ${REMOTE_DIR}"

# 2. 同步项目文件到服务器
echo ">>> [2/4] 同步项目文件到 ${SERVER}..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.venv' \
  --exclude 'dist' \
  --exclude 'pgdata' \
  --exclude 'uploads' \
  --exclude '.env' \
  ./ root@${SERVER}:${REMOTE_DIR}/

# 3. 复制 .env 文件（需先在服务器上手动创建）
echo ">>> [3/4] 检查 .env 文件..."
ssh root@${SERVER} "test -f ${REMOTE_DIR}/.env || cp ${REMOTE_DIR}/.env.example ${REMOTE_DIR}/.env"

# 4. 启动服务
echo ">>> [4/4] 启动 Docker 服务..."
ssh root@${SERVER} "cd ${REMOTE_DIR} && docker compose up -d --build"

echo ""
echo "✅ 部署完成！"
echo "访问地址: http://${SERVER}:5002"
echo "默认账号: admin / admin123"
echo ""
echo "查看日志: ssh root@${SERVER} 'cd ${REMOTE_DIR} && docker compose logs -f'"
