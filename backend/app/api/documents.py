from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os, shutil
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.config import settings
from app.models.user import User
from app.models.sop import DocumentFile
from app.schemas.schemas import DocFileOut

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=List[DocFileOut])
def list_files(
    folder_name: str = None,
    trip_filter: str = "全部",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    q = db.query(DocumentFile)
    if folder_name:
        q = q.filter(DocumentFile.folder_name == folder_name)
    if trip_filter != "全部":
        q = q.filter(DocumentFile.trip_filter.in_(["全部", trip_filter]))
    return q.order_by(DocumentFile.created_at.desc()).all()


@router.post("/upload")
async def upload_file(
    folder_name: str = "默认",
    trip_filter: str = "全部",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin)
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    safe_name = f"{user.id}_{int(os.urandom(4).hex(), 16)}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = DocumentFile(
        filename=safe_name,
        original_name=file.filename,
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        file_type=ext,
        folder_name=folder_name,
        trip_filter=trip_filter,
        uploaded_by=user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    doc = db.query(DocumentFile).filter(DocumentFile.id == file_id).first()
    if not doc:
        raise HTTPException(404, "文件不存在")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return {"ok": True}
