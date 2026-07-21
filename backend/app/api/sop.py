from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User
from app.models.sop import SopFolder, SopDocument
from app.schemas.schemas import SopFolderOut, SopDocumentOut, SopDocumentCreate, SopDocumentUpdate

router = APIRouter(prefix='/api/sop', tags=['SOP'])

@router.get('/folders', response_model=List[SopFolderOut])
def list_folders(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(SopFolder).order_by(SopFolder.sort_order).all()

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
