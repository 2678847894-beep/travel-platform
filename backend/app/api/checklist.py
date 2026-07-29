from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User
from app.models.sop import ChecklistItem
from app.schemas.schemas import ChecklistItemOut, ChecklistItemCreate

router = APIRouter(prefix='/api/checklist', tags=['Checklist'])

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
    return q.all()

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
