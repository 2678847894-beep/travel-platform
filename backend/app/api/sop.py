from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User
from app.models.sop import SopFolder, SopDocument
from app.schemas.schemas import SopFolderOut, SopDocumentOut, SopDocumentCreate, SopDocumentUpdate

router = APIRouter(prefix='/api/sop', tags=['SOP'])


class SopFolderCreate(BaseModel):
    name: str
    icon: str = "📁"
    trip_filter: str = "香港差旅"
    order_index: int = 0


@router.get('/folders', response_model=List[SopFolderOut])
def list_folders(trip_filter: str = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(SopFolder)
    if trip_filter and trip_filter != '全部':
        q = q.filter(SopFolder.trip_filter == trip_filter)
    return q.order_by(SopFolder.sort_order).all()


@router.post('/folders', response_model=SopFolderOut)
def create_folder(body: SopFolderCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    folder = SopFolder(
        name=body.name,
        description="",
        sort_order=body.order_index,
        trip_filter=body.trip_filter,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.delete('/folders/{folder_id}')
def delete_folder(folder_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    folder = db.query(SopFolder).filter(SopFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail='Not found')
    # 级联删除该文件夹下的所有文档
    db.query(SopDocument).filter(SopDocument.folder_id == folder_id).delete()
    db.delete(folder)
    db.commit()
    return {'ok': True}


class SopBulkDelete(BaseModel):
    folder_ids: List[int]


@router.post('/folders/bulk-delete')
def bulk_delete_folders(body: SopBulkDelete, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """批量删除文件夹及其文档"""
    folder_ids = body.folder_ids
    deleted_folders = 0
    deleted_docs = 0
    for folder_id in folder_ids:
        folder = db.query(SopFolder).filter(SopFolder.id == folder_id).first()
        if folder:
            doc_count = db.query(SopDocument).filter(SopDocument.folder_id == folder_id).delete()
            deleted_docs += doc_count
            db.delete(folder)
            deleted_folders += 1
    db.commit()
    return {'deleted_folders': deleted_folders, 'deleted_documents': deleted_docs}

@router.get('/documents', response_model=List[SopDocumentOut])
def list_documents(folder_id: int = None, trip_filter: str = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(SopDocument)
    if folder_id:
        q = q.filter(SopDocument.folder_id == folder_id)
    if trip_filter and trip_filter != 'all':
        q = q.filter(SopDocument.trip_filter == trip_filter)
    docs = q.order_by(SopDocument.sort_order).all()
    for d in docs:
        if d.folder:
            d.folder_name = d.folder.name
    return docs

@router.get('/documents/{doc_id}', response_model=SopDocumentOut)
def get_document(doc_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    doc = db.query(SopDocument).filter(SopDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail='Not found')
    if doc.folder:
        doc.folder_name = doc.folder.name
    return doc

@router.put('/documents/{doc_id}', response_model=SopDocumentOut)
def update_document(doc_id: int, body: SopDocumentUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    doc = db.query(SopDocument).filter(SopDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail='Not found')
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(doc, key, val)
    db.commit()
    db.refresh(doc)
    return doc

@router.post('/documents', response_model=SopDocumentOut)
def create_document(body: SopDocumentCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    doc = SopDocument(**body.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.delete('/documents/{doc_id}')
def delete_document(doc_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    doc = db.query(SopDocument).filter(SopDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(doc)
    db.commit()
    return {'ok': True}

@router.post('/documents/{doc_id}/toggle/{step_order}')
def toggle_step(doc_id: int, step_order: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    doc = db.query(SopDocument).filter(SopDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail='Not found')
    steps = doc.steps or []
    for s in steps:
        if s['order'] == step_order:
            s['status'] = not s.get('status', False)
    doc.steps = steps
    db.commit()
    return {'ok': True}
