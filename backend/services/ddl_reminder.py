"""DDL 提醒服务 — 后台定期检查即将到期的任务并生成通知"""
import asyncio
import threading
import time
from datetime import datetime, timedelta
from database import SessionLocal
from models import Task, User, Notification


def check_ddl_and_notify():
    """检查所有用户的DDL并生成提醒通知"""
    db = SessionLocal()
    try:
        now = datetime.now()
        # 3天内到期且未完成的任务
        upcoming = db.query(Task).filter(
            Task.status != "已完成",
            Task.deadline.isnot(None),
            Task.deadline >= now,
            Task.deadline <= now + timedelta(days=3),
        ).all()

        # 已超期的任务
        overdue = db.query(Task).filter(
            Task.status != "已完成",
            Task.deadline.isnot(None),
            Task.deadline < now,
        ).all()

        tasks_to_notify = []
        for task in upcoming:
            days_left = (task.deadline - now).days
            if days_left < 0:
                days_left = 0
            # 检查是否已发送过提醒（24小时内不重复）
            existing = db.query(Notification).filter(
                Notification.user_id == task.user_id,
                Notification.related_task_id == task.id,
                Notification.type == "ddl",
                Notification.created_at >= now - timedelta(hours=24),
            ).first()
            if not existing:
                urgency = "紧急" if days_left <= 1 else "即将"
                tasks_to_notify.append({
                    "user_id": task.user_id,
                    "type": "ddl",
                    "title": f"任务{urgency}截止",
                    "message": f"「{task.title}」还有{days_left}天截止，当前进度{task.progress}%",
                    "related_task_id": task.id,
                    "created_at": now,
                })

        for task in overdue:
            days_overdue = (now - task.deadline).days
            existing = db.query(Notification).filter(
                Notification.user_id == task.user_id,
                Notification.related_task_id == task.id,
                Notification.type == "ddl",
                Notification.created_at >= now - timedelta(hours=24),
            ).first()
            if not existing:
                tasks_to_notify.append({
                    "user_id": task.user_id,
                    "type": "ddl",
                    "title": "任务已超期",
                    "message": f"「{task.title}」已超期{days_overdue}天，请尽快处理",
                    "related_task_id": task.id,
                    "created_at": now,
                })

        # 批量创建通知
        for item in tasks_to_notify:
            notif = Notification(
                user_id=item["user_id"],
                type=item["type"],
                title=item["title"],
                message=item["message"],
                related_task_id=item["related_task_id"],
                is_read=False,
            )
            db.add(notif)

        if tasks_to_notify:
            db.commit()
            return len(tasks_to_notify)

        db.commit()
        return 0

    except Exception as e:
        db.rollback()
        print(f"[DDL Reminder] Error: {e}")
        return 0
    finally:
        db.close()


def start_ddl_scheduler(interval_minutes: int = 30):
    """启动DDL检查调度器（后台线程）"""
    def run():
        print(f"[DDL Reminder] Started, checking every {interval_minutes} min")
        while True:
            try:
                count = check_ddl_and_notify()
                if count > 0:
                    print(f"[DDL Reminder] Sent {count} notifications")
            except Exception as e:
                print(f"[DDL Reminder] Scheduler error: {e}")
            time.sleep(interval_minutes * 60)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return thread


# 全局调度器引用
_scheduler_thread = None


def init_scheduler():
    """初始化调度器（应用启动时调用）"""
    global _scheduler_thread
    if _scheduler_thread is None:
        _scheduler_thread = start_ddl_scheduler(interval_minutes=30)
