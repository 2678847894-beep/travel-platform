from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User
from app.models.sop import Trip, TripItem, ChecklistItem
from app.schemas.schemas import TripOut, TripCreate, ChecklistItemOut

router = APIRouter(prefix='/api/trips', tags=['Trips'])


@router.get('', response_model=List[TripOut])
def list_trips(template: str = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Trip).order_by(Trip.created_at.desc())
    if template:
        q = q.filter(Trip.template == template)
    return q.all()


@router.post('', response_model=TripOut)
def create_trip(body: TripCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    trip = Trip(**body.model_dump())
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.delete('/{trip_id}')
def delete_trip(trip_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404)
    db.delete(trip)
    db.commit()
    return {'ok': True}


@router.get('/{trip_id}/items', response_model=List[ChecklistItemOut])
def list_trip_items(
    trip_id: int,
    filter_type: str = 'all',
    filter_text: str = '',
    pool: str = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="行程不存在")

    # Get all shared items for this template
    items = db.query(ChecklistItem).filter(
        ChecklistItem.checklist_template == trip.template
    ).order_by(ChecklistItem.sort_order.asc(), ChecklistItem.created_at.desc()).all()

    # Get trip-specific prepared statuses
    trip_item_map = {}
    for ti in db.query(TripItem).filter(TripItem.trip_id == trip_id).all():
        trip_item_map[ti.checklist_item_id] = ti.is_prepared

    result = []
    for item in items:
        item_dict = {
            'id': item.id,
            'name': item.name,
            'category': item.category,
            'checklist_template': item.checklist_template,
            'is_prepared': trip_item_map.get(item.id, False),
            'is_essential': item.is_essential,
            'is_international': item.is_international,
            'is_electronic': item.is_electronic,
            'pool': item.pool or '未准备',
            'image_data': item.image_data or '',
            'trip_date': item.trip_date,
            'related_doc_id': item.related_doc_id,
            'sort_order': item.sort_order,
        }
        result.append(item_dict)

    # Apply filters
    if pool:
        result = [r for r in result if r['pool'] == pool]
    if filter_type == 'prepared':
        result = [r for r in result if r['is_prepared']]
    elif filter_type == 'unprepared':
        result = [r for r in result if not r['is_prepared']]
    elif filter_type == 'essential':
        result = [r for r in result if r['is_essential']]
    if filter_text:
        result = [r for r in result if filter_text.lower() in r['name'].lower() or filter_text.lower() in r['category'].lower()]

    return result


@router.post('/{trip_id}/items/{item_id}/toggle')
def toggle_trip_item(trip_id: int, item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ti = db.query(TripItem).filter(TripItem.trip_id == trip_id, TripItem.checklist_item_id == item_id).first()
    if ti:
        ti.is_prepared = not ti.is_prepared
    else:
        ti = TripItem(trip_id=trip_id, checklist_item_id=item_id, is_prepared=True)
        db.add(ti)
    db.commit()
    return {'ok': True, 'is_prepared': ti.is_prepared}
