from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.sop import SopDocument, ChecklistItem, DailyTask
from app.schemas.schemas import AiAskRequest, AiAskResponse

router = APIRouter(prefix='/api/ai', tags=['AI'])

@router.post('/ask', response_model=AiAskResponse)
def ai_ask(body: AiAskRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = body.question.strip().lower()
    keywords = ['hotel', 'visa', 'passport', 'checkin', 'sop']
    for kw in keywords:
        if kw in q:
            docs = db.query(SopDocument).limit(2).all()
            if docs:
                parts = []
                for d in docs:
                    parts.append(f'[{d.title}]')
                    if d.steps:
                        for s in d.steps[:3]:
                            parts.append(f'  {s.get("order","")}. {s.get("title","")}')
                return {'answer': '\n'.join(parts)}
    items = db.query(ChecklistItem).filter(ChecklistItem.is_essential == True).limit(5).all()
    if items:
        return {'answer': 'Essential:\n' + '\n'.join(f'- {i.name}' for i in items)}
    tasks = db.query(DailyTask).filter(DailyTask.is_completed == False).limit(5).all()
    if tasks:
        return {'answer': 'Pending:\n' + '\n'.join(f'- {t.title}' for t in tasks)}
    return {'answer': 'Travel AI here. Ask me about SOPs, checklists, or tasks.'}
