# redeploy trigger
from fastapi import FastAPI
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
