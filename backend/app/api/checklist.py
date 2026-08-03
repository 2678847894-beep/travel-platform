from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User
from app.models.sop import ChecklistItem
from app.schemas.schemas import ChecklistItemOut, ChecklistItemCreate

router = APIRouter(prefix='/api/checklist', tags=['Checklist'])

# Reorder request schema
class ReorderItem(BaseModel):
    id: int
    sort_order: int

class ReorderRequest(BaseModel):
    items: List[ReorderItem]


@router.get('', response_model=List[ChecklistItemOut])
def list_items(template: str = 'default', filter_type: str = 'all', trip_date: str = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(ChecklistItem).filter(ChecklistItem.checklist_template == template)
    if trip_date:
        q = q.filter(ChecklistItem.trip_date == trip_date)
    if filter_type == 'prepared':
        q = q.filter(ChecklistItem.is_prepared == True)
    elif filter_type == 'unprepared':
        q = q.filter(ChecklistItem.is_prepared == False)
    elif filter_type == 'essential':
        q = q.filter(ChecklistItem.is_essential == True)
    return q.order_by(ChecklistItem.sort_order.asc(), ChecklistItem.created_at.desc()).all()


@router.put('/reorder')
def reorder_items(body: ReorderRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Batch update sort_order for checklist items (drag-and-drop reorder)."""
    id_to_order = {item.id: item.sort_order for item in body.items}
    items = db.query(ChecklistItem).filter(ChecklistItem.id.in_(id_to_order.keys())).all()
    for item in items:
        item.sort_order = id_to_order[item.id]
    db.commit()
    return {'ok': True, 'updated': len(items)}

@router.post('', response_model=ChecklistItemOut)
def create_item(body: ChecklistItemCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    item = ChecklistItem(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post('/{item_id}/toggle')
def toggle_item(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404)
    item.is_prepared = not item.is_prepared
    db.commit()
    return {'ok': True}


@router.put('/{item_id}')
def update_item(item_id: int, body: ChecklistItemCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404)
    item.name = body.name
    item.category = body.category
    if body.image_data:
        item.image_data = body.image_data
    item.is_essential = body.is_essential
    db.commit()
    return {'ok': True}
