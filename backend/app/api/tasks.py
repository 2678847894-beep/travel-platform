from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User
from app.models.sop import DailyTask
from app.schemas.schemas import TaskOut, TaskCreate

router = APIRouter(prefix='/api/tasks', tags=['Tasks'])

@router.get('', response_model=List[TaskOut])
def list_tasks(task_date: str = None, trip_filter: str = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(DailyTask)
    if task_date:
        q = q.filter(cast(DailyTask.task_date, Date) == task_date)
    if trip_filter and trip_filter != 'all':
        q = q.filter(DailyTask.trip_filter == trip_filter)
    return q.order_by(DailyTask.task_time, DailyTask.id).all()

@router.post('', response_model=TaskOut)
def create_task(body: TaskCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    task = DailyTask(**body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.post('/{task_id}/toggle')
def toggle_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    task = db.query(DailyTask).filter(DailyTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    task.is_completed = not task.is_completed
    db.commit()
    return {'ok': True}

@router.delete('/{task_id}')
def delete_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    task = db.query(DailyTask).filter(DailyTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    db.delete(task)
    db.commit()
    return {'ok': True}
