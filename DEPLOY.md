# 差旅管理平台 - 部署手册

## 1. 前置条件
- 服务器已安装 Docker 和 Docker Compose
- 服务器端口 5002 已开放

## 2. 部署步骤

### 方式一：一键部署（推荐）
```bash
chmod +x deploy.sh
./deploy.sh
```

### 方式二：手动部署
```bash
# 上传到服务器
scp -r travel-platform/ root@116.62.135.182:/opt/

# SSH 到服务器
ssh root@116.62.135.182
cd /opt/travel-platform

# 启动所有服务
docker compose up -d --build
```

## 3. 访问
- 地址: http://116.62.135.182:5002
- 默认管理员: admin / admin123

## 4. 常用命令
```bash
# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 重新构建
docker compose up -d --build

# 进入后端容器
docker exec -it travel-backend bash
```

## 5. 数据备份
```bash
# 备份数据库
docker exec travel-db pg_dump -U travel_admin travel_platform > backup.sql

# 备份上传文件
tar -czf uploads_backup.tar.gz uploads/
```
