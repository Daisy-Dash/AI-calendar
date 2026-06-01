"""任务相关路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from models import User, Task, TaskStatus
from schemas import TaskCreate, TaskUpdate, TaskResponse, ProgressUpdate
from auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["任务"])


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
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)
    if group_id:
        query = query.filter(Task.group_id == group_id)
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
    return task
