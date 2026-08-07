# redeploy trigger v2 - 20260805
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import text
from app.core.database import engine, Base
from app.core.config import settings
from app.api import auth, sop, tasks, documents, checklist, trips, ai
from app.api.trips import template_router

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
    conn.execute(text(
        "ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT ''"
    ))
    conn.execute(text(
        "ALTER TABLE sop_folders ADD COLUMN IF NOT EXISTS trip_filter VARCHAR(50) DEFAULT '香港差旅'"
    ))
    conn.execute(text(
        "ALTER TABLE sop_folders ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '📁'"
    ))
    conn.execute(text(
        "ALTER TABLE sop_documents ADD COLUMN IF NOT EXISTS trip_filter VARCHAR(50) DEFAULT '香港差旅'"
    ))
    conn.execute(text(
        "CREATE TABLE IF NOT EXISTS trip_templates ("
        "  id SERIAL PRIMARY KEY,"
        "  name VARCHAR(100) NOT NULL,"
        "  icon VARCHAR(10) DEFAULT '🌍',"
        "  sort_order INTEGER DEFAULT 0,"
        "  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
        ")"
    ))
    conn.execute(text(
        "INSERT INTO trip_templates (name, icon, sort_order) VALUES "
        "  ('香港差旅', '🌏', 0),"
        "  ('欧洲差旅', '🌍', 1),"
        "  ('日本差旅', '🗾', 2),"
        "  ('国内差旅', '🏠', 3)"
        "  ON CONFLICT DO NOTHING"
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
app.include_router(template_router)
app.include_router(ai.router)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "差旅管家"}


# 前端 SPA：如果 static 目录存在（Docker 镜像内打包），则 serve 前端
static_dir = "static"
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
