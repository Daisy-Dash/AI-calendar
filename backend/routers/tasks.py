"""任务相关路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from models import User, Task, GroupMember, TaskStatus
from schemas import TaskCreate, TaskUpdate, TaskResponse, ProgressUpdate
from auth import get_current_user
import asyncio

router = APIRouter(prefix="/api/tasks", tags=["任务"])


@router.get("/export/csv")
def export_tasks_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出任务为CSV文件"""
    from fastapi.responses import Response
    import csv
    import io

    tasks = db.query(Task).filter(
        Task.user_id == current_user.id
    ).order_by(Task.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "标题", "描述", "优先级", "状态", "进度(%)", "预估时间(h)", "截止日期", "标签", "创建时间"])
    for t in tasks:
        writer.writerow([
            t.id, t.title, t.description or "", t.priority,
            t.status, t.progress, t.estimated_hours or "",
            t.deadline.strftime("%Y-%m-%d") if t.deadline else "",
            ",".join(t.tags) if t.tags else "",
            t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=ai_calendar_tasks.csv"},
    )


def _broadcast_task_change(user_id: int, event: str, task_data: dict):
    """异步广播任务变更（非阻塞）"""
    try:
        from services.ws_manager import manager
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(manager.send_to_user(user_id, {
                "type": "task_update",
                "event": event,
                "data": task_data,
            }))
    except Exception:
        pass  # 静默失败，不影响主流程


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    status_filter: Optional[str] = None,
    priority: Optional[int] = None,
    group_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务列表（支持筛选）"""
    # 如果指定了群组ID，显示群组所有任务（需检查成员身份）
    if group_id:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="您不是该群组成员")

        query = db.query(Task).filter(Task.group_id == group_id)
    else:
        query = db.query(Task).filter(Task.user_id == current_user.id)

    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.contains(search))

    query = query.order_by(Task.created_at.desc())
    return query.all()


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建任务"""
    task = Task(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        estimated_hours=data.estimated_hours,
        tags=data.tags or [],
        group_id=data.group_id,
        parent_id=data.parent_id,
    )
    if data.deadline:
        task.deadline = datetime.fromisoformat(data.deadline.replace("Z", "+00:00"))

    db.add(task)
    db.commit()
    db.refresh(task)

    # 广播变更
    _broadcast_task_change(current_user.id, "created", {
        "id": task.id, "title": task.title, "status": task.status,
    })

    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务详情"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新任务"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    update_data = data.model_dump(exclude_unset=True)
    if "deadline" in update_data and update_data["deadline"]:
        update_data["deadline"] = datetime.fromisoformat(update_data["deadline"].replace("Z", "+00:00"))

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    _broadcast_task_change(current_user.id, "updated", {
        "id": task.id, "title": task.title, "status": task.status, "progress": task.progress,
    })

    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除任务"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    db.delete(task)
    db.commit()

    _broadcast_task_change(current_user.id, "deleted", {"id": task_id})


@router.put("/{task_id}/progress", response_model=TaskResponse)
def update_progress(
    task_id: int,
    data: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新任务进度"""
    if data.progress < 0 or data.progress > 100:
        raise HTTPException(status_code=400, detail="进度值必须在0-100之间")

    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task.progress = data.progress
    if data.progress == 100:
        task.status = TaskStatus.COMPLETED.value
    elif data.progress > 0:
        task.status = TaskStatus.IN_PROGRESS.value

    db.commit()
    db.refresh(task)

    _broadcast_task_change(current_user.id, "progress", {
        "id": task.id, "title": task.title, "progress": task.progress, "status": task.status,
    })

    return task
