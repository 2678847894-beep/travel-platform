from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User
from app.models.sop import ChecklistItem, TripItem
from app.schemas.schemas import ChecklistItemOut, ChecklistItemCreate
import tempfile, os, io, openpyxl

router = APIRouter(prefix='/api/checklist', tags=['Checklist'])

# Reorder request schema
class ReorderItem(BaseModel):
    id: int
    sort_order: int

class ReorderRequest(BaseModel):
    items: List[ReorderItem]


# AI 导入请求 schema
class AiImportItem(BaseModel):
    name: str
    category: str = "其他"
    extras: str = ""


class AiImportConfirmRequest(BaseModel):
    items: List[AiImportItem]
    checklist_template: str = "默认"
    trip_id: Optional[int] = None


@router.get('', response_model=List[ChecklistItemOut])
def list_items(template: str = 'default', filter_type: str = 'all', trip_date: str = None, pool: str = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(ChecklistItem).filter(ChecklistItem.checklist_template == template)
    if trip_date:
        q = q.filter(ChecklistItem.trip_date == trip_date)
    if pool:
        q = q.filter(ChecklistItem.pool == pool)
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


# ── AI 智能识别列映射 ──
def _detect_header_and_columns(sheet):
    """返回 (header_row_index, name_col, category_col, other_col_indices)"""
    name_keywords = ['名称', '物品', '项目', 'name', 'item', '物品名称', '品名']
    category_keywords = ['分类', '类别', 'category', '类型', '种类']

    rows = list(sheet.iter_rows(max_row=min(sheet.max_row, 50), values_only=False))
    if not rows:
        return None, None, None, []

    # 检测表头行：找第一个包含关键词的非空行
    header_row_idx = None
    for i, row in enumerate(rows):
        vals = [str(c.value).strip().lower() if c.value is not None else '' for c in row]
        all_kw = name_keywords + category_keywords
        if any(any(kw in v for kw in all_kw) for v in vals if v):
            header_row_idx = i
            break

    headers = []
    if header_row_idx is not None:
        headers = [str(c.value).strip() if c.value is not None else '' for c in rows[header_row_idx]]
    else:
        # 如果没有表头行，视作无header
        header_row_idx = -1

    name_col = None
    category_col = None
    other_cols = []

    if headers:
        for idx, h in enumerate(headers):
            h_lower = h.lower()
            if name_col is None and any(kw in h_lower for kw in name_keywords):
                name_col = idx
            elif category_col is None and any(kw in h_lower for kw in category_keywords):
                category_col = idx
            else:
                other_cols.append(idx)

    # 没找到名称列：取第一个有实际文本数据的列
    if name_col is None and headers:
        name_col = 0 if 0 not in ([category_col] if category_col is not None else []) else 1

    return header_row_idx, name_col, category_col, other_cols


@router.post('/ai-import-preview')
def ai_import_preview(file: UploadFile = File(...), db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """上传 Excel 并智能解析，返回物品列表预览"""
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail='仅支持 .xlsx / .xls 文件')

    try:
        contents = file.file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'无法读取 Excel 文件: {str(e)}')

    sheet = wb[wb.sheetnames[0]]
    header_idx, name_col, cat_col, other_cols = _detect_header_and_columns(sheet)

    data_start = (header_idx or -1) + 1 if header_idx is not None else 0
    if data_start < 0:
        data_start = 0

    items = []
    for row in sheet.iter_rows(min_row=data_start + 1, values_only=True):
        if row is None:
            continue
        # 跳过完全空行
        if all(c is None or str(c).strip() == '' for c in row):
            continue

        row_vals = [str(c).strip() if c is not None else '' for c in row]

        name = ''
        if name_col is not None and name_col < len(row_vals) and row_vals[name_col]:
            name = row_vals[name_col]
        else:
            # fallback: 取第一个非空文本
            for v in row_vals:
                if v:
                    name = v
                    break
        if not name:
            continue

        category = ''
        if cat_col is not None and cat_col < len(row_vals) and row_vals[cat_col]:
            category = row_vals[cat_col]
        else:
            category = '其他'

        extras_parts = []
        for oc in other_cols:
            if oc < len(row_vals) and row_vals[oc]:
                extras_parts.append(row_vals[oc])
        extras = '; '.join(extras_parts)

        items.append({'name': name, 'category': category, 'extras': extras})

    wb.close()
    return {'items': items, 'total': len(items)}


@router.post('/ai-import-confirm')
def ai_import_confirm(body: AiImportConfirmRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """确认导入：批量创建 ChecklistItem，如指定 trip_id 则关联 TripItem"""
    template = body.checklist_template
    trip_id = body.trip_id
    created = 0

    for it in body.items:
        # 计算 sort_order
        max_order = db.query(ChecklistItem).filter(
            ChecklistItem.checklist_template == template
        ).count()
        item = ChecklistItem(
            name=it.name,
            category=it.category or '其他',
            checklist_template=template,
            sort_order=max_order + created,
        )
        db.add(item)
        db.flush()

        if trip_id:
            trip_item = TripItem(trip_id=trip_id, checklist_item_id=item.id, is_prepared=False)
            db.add(trip_item)

        created += 1

    db.commit()
    return {'ok': True, 'created': created}
