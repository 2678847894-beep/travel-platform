from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SopFolder(Base):
    __tablename__ = "sop_folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(10), default="📁")
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    trip_filter = Column(String(50), default="香港差旅")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    documents = relationship("SopDocument", back_populates="folder", cascade="all, delete-orphan", lazy="selectin")


class SopDocument(Base):
    __tablename__ = "sop_documents"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("sop_folders.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    steps = Column(JSON, default=[])
    responsible = Column(String(100), default="")
    execution_time = Column(String(100), default="")
    trip_filter = Column(String(50), default="香港差旅")
    notes = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    folder = relationship("SopFolder", back_populates="documents")


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    task_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    task_time = Column(String(10), default="")
    end_time = Column(String(10), default="")
    location = Column(String(200), default="")
    description = Column(Text, default="")
    trip_filter = Column(String(50), default="全部")
    category = Column(String(50), default="")
    is_completed = Column(Boolean, default=False)
    completed_date = Column(Date, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DocumentFile(Base):
    __tablename__ = "document_files"

    id = Column(Integer, primary_key=True, index=True)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), default="")
    file_size = Column(Integer, default=0)
    folder_name = Column(String(100), default="证件类")
    trip_filter = Column(String(50), default="全部")
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), default="其他")
    checklist_template = Column(String(100), default="默认")
    is_prepared = Column(Boolean, default=False)
    is_essential = Column(Boolean, default=False)
    is_international = Column(Boolean, default=False)
    is_electronic = Column(Boolean, default=False)
    pool = Column(String(20), default="未准备")
    image_data = Column(Text, default="")
    trip_date = Column(Date, nullable=True)
    related_doc_id = Column(Integer, ForeignKey("document_files.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    template = Column(String(100), nullable=False)
    trip_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TripItem(Base):
    __tablename__ = "trip_items"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    checklist_item_id = Column(Integer, ForeignKey("checklist_items.id", ondelete="CASCADE"), nullable=False)
    is_prepared = Column(Boolean, default=False)


class TripTemplate(Base):
    __tablename__ = "trip_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(10), default="🌍")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
