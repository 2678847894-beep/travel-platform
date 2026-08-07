from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


# ── 认证 ──
class LoginRequest(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    nickname: str
    role: str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── SOP ──
class SopStep(BaseModel):
    order: int
    title: str
    detail: Optional[str] = ""
    status: bool = False
    checked_at: Optional[str] = None

class SopDocumentOut(BaseModel):
    id: int
    folder_id: Optional[int] = None
    title: str
    description: Optional[str] = ""
    steps: List[SopStep] = []
    responsible: str = ""
    execution_time: str = ""
    trip_filter: str = "香港差旅"
    notes: str = ""
    sort_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    folder_name: Optional[str] = ""
    class Config:
        from_attributes = True

class SopFolderOut(BaseModel):
    id: int
    name: str
    icon: str = "📁"
    description: Optional[str] = ""
    sort_order: int = 0
    trip_filter: str = "香港差旅"
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    documents: List[SopDocumentOut] = []
    class Config:
        from_attributes = True

class SopDocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[SopStep]] = None
    notes: Optional[str] = None
    responsible: Optional[str] = None
    execution_time: Optional[str] = None
    trip_filter: Optional[str] = None
    folder_id: Optional[int] = None

class SopDocumentCreate(BaseModel):
    folder_id: int
    title: str
    description: Optional[str] = ""
    steps: Optional[List[SopStep]] = []
    responsible: str = ""
    execution_time: str = ""
    trip_filter: str = "香港差旅"


# ── 每日任务 ──
class TaskOut(BaseModel):
    id: int
    title: str
    task_date: datetime
    end_date: Optional[datetime] = None
    task_time: str = ""
    end_time: str = ""
    location: str = ""
    description: str = ""
    trip_filter: str = "全部"
    category: str = ""
    is_completed: bool = False
    is_overdue: bool = False
    completed_date: Optional[date] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    task_date: datetime
    end_date: Optional[datetime] = None
    task_time: str = ""
    end_time: str = ""
    location: str = ""
    description: str = ""
    trip_filter: str = "全部"
    category: str = ""


# ── 文档文件 ──
class DocFileOut(BaseModel):
    id: int
    original_name: str
    file_path: str
    file_type: str = ""
    file_size: int = 0
    folder_name: str = "证件类"
    trip_filter: str = "全部"
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── 物品清单 ──
class ChecklistItemOut(BaseModel):
    id: int
    name: str
    category: str = "其他"
    checklist_template: str = "默认"
    is_prepared: bool = False
    is_essential: bool = False
    is_international: bool = False
    is_electronic: bool = False
    pool: str = "未准备"
    image_data: str = ""
    trip_date: Optional[date] = None
    related_doc_id: Optional[int] = None
    sort_order: int = 0
    class Config:
        from_attributes = True

class ChecklistItemCreate(BaseModel):
    name: str
    category: str = "其他"
    checklist_template: str = "默认"
    is_essential: bool = False
    is_international: bool = False
    is_electronic: bool = False
    pool: str = "未准备"
    image_data: str = ""
    trip_date: Optional[date] = None
    sort_order: int = 0


# ── 行程 ──
class TripOut(BaseModel):
    id: int
    name: str
    template: str
    trip_date: Optional[date] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TripCreate(BaseModel):
    name: str
    template: str
    trip_date: Optional[date] = None


# ── 行程模板 ──
class TripTemplateOut(BaseModel):
    id: int
    name: str
    icon: str = "🌍"
    sort_order: int = 0
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TripTemplateCreate(BaseModel):
    name: str
    icon: str = "🌍"
    sort_order: int = 0


# ── AI 问答 ──
class AiAskRequest(BaseModel):
    question: str

class AiAskResponse(BaseModel):
    answer: str
