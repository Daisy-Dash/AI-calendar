"""任务相关路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from models import User, Task, GroupMember, TaskStatus, Schedule
from schemas import TaskCreate, TaskUpdate, TaskResponse, ProgressUpdate
from auth import get_current_user
import asyncio

router = APIRouter(prefix="/api/tasks", tags=["任务"])


def _sync_task_to_schedule(db: Session, task: Task):
    """将任务DDL同步到日历日程"""
    if not task.deadline:
        return
    # 查找是否已有该任务的日程
    existing = db.query(Schedule).filter(Schedule.task_id == task.id).first()
    if existing:
        # 更新已有日程
        existing.title = task.title
        existing.date = task.deadline
        existing.color = _get_task_color(task.priority)
        existing.note = f"优先级: {['低','中','高','紧急'][task.priority-1]} | 进度: {task.progress}%"
    else:
        # 创建新日程
        schedule = Schedule(
            user_id=task.user_id,
            task_id=task.id,
            title=task.title,
            date=task.deadline,
            color=_get_task_color(task.priority),
            note=f"优先级: {['低','中','高','紧急'][task.priority-1]} | 进度: {task.progress}%",
        )
        db.add(schedule)


def _remove_task_schedule(db: Session, task_id: int):
    """删除任务对应的日程"""
    db.query(Schedule).filter(Schedule.task_id == task_id).delete()


def _get_task_color(priority: int) -> str:
    """根据优先级返回颜色"""
    colors = {1: "#9E9E9E", 2: "#2196F3", 3: "#FF9800", 4: "#F44336"}
    return colors.get(priority, "#FF9F43")


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
    if data.start_time:
        task.start_time = datetime.fromisoformat(data.start_time.replace("Z", "+00:00"))
    if data.end_time:
        task.end_time = datetime.fromisoformat(data.end_time.replace("Z", "+00:00"))

    db.add(task)
    db.commit()
    db.refresh(task)

    # 同步到日历日程
    if task.deadline:
        _sync_task_to_schedule(db, task)
        db.commit()

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
    for time_field in ("deadline", "start_time", "end_time"):
        if time_field in update_data and update_data[time_field]:
            update_data[time_field] = datetime.fromisoformat(update_data[time_field].replace("Z", "+00:00"))

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    # 同步DDL到日历
    _sync_task_to_schedule(db, task)
    db.commit()

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
    # 同时删除对应日程
    _remove_task_schedule(db, task_id)
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
