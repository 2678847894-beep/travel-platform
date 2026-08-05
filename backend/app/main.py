# redeploy trigger
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import text
from app.core.database import engine, Base
from app.core.config import settings
from app.api import auth, sop, tasks, documents, checklist, trips, ai

Base.metadata.create_all(bind=engine)

# Startup migration: add sort_order column to checklist_items if not exists
with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0"
    ))
    conn.execute(text(
        "ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS pool VARCHAR(20) DEFAULT '未准备'"
    ))
    conn.execute(text(
        "ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS completed_date DATE"
    ))
    conn.commit()

app = FastAPI(title="差旅管家 API", version="1.0.0")

# CORS: 部署后改为实际域名列表，目前开发阶段允许所有来源
# 公共浏览端（无需鉴权）的 GET 类只读 API（sop/folders, sop/documents, tasks, checklist, documents）
# 通过依赖注入中的可选鉴权实现；管理后台写操作需 Bearer Token
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 移动端适配：上传文件大小限制 10MB
@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_UPLOAD_SIZE:
        return JSONResponse(status_code=413, content={"detail": "文件大小超过限制（最大10MB）"})
    return await call_next(request)

app.include_router(auth.router)
app.include_router(sop.router)
app.include_router(tasks.router)
app.include_router(documents.router)
app.include_router(checklist.router)
app.include_router(trips.router)
app.include_router(ai.router)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "差旅管家"}


@app.get("/", response_class=HTMLResponse)
def root():
    return """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>差旅管家 - API 后端</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .card {
            background: white; border-radius: 16px; padding: 48px 40px;
            max-width: 480px; width: 90%; text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .badge {
            display: inline-block; background: #667eea; color: white;
            padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
            letter-spacing: 0.5px; margin-bottom: 24px;
        }
        h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
        .subtitle { color: #888; font-size: 15px; margin-bottom: 36px; line-height: 1.6; }
        .links { display: flex; flex-direction: column; gap: 12px; }
        .links a {
            display: block; padding: 14px 20px; border-radius: 10px;
            text-decoration: none; font-weight: 600; font-size: 15px;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .links a:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #f0f0f5; color: #444; }
        .btn-outline { background: white; color: #667eea; border: 2px solid #667eea; }
        .footer { margin-top: 36px; font-size: 12px; color: #bbb; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">API Backend</div>
        <h1>差旅管家</h1>
        <p class="subtitle">后端服务运行中<br>请使用以下入口访问</p>
        <div class="links">
            <a href="/docs" class="btn-primary">Swagger API 文档</a>
            <a href="/redoc" class="btn-secondary">ReDoc 文档</a>
            <a href="https://travel-platform-six.vercel.app" class="btn-outline">前往前端页面</a>
        </div>
        <p class="footer">Render · FastAPI · PostgreSQL</p>
    </div>
</body>
</html>"""
