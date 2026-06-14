"""AI知识库自动更新调度器 — 对话空闲30分钟后自动重建"""
import threading
import time
from datetime import datetime, timedelta
from database import SessionLocal
from sqlalchemy import func as sql_func


IDLE_MINUTES = 30
CHECK_INTERVAL_MINUTES = 5


def check_and_rebuild():
    """检查所有活跃群组，空闲30分钟且有新消息则重建知识库"""
    db = SessionLocal()
    try:
        from models import Group
        from models.message import GroupMessage

        now = datetime.now()
        threshold = now - timedelta(minutes=IDLE_MINUTES)

        active_groups = db.query(Group).filter(
            Group.status.in_(["discussing", "confirming", "in_progress"]),
        ).all()

        rebuilt = 0
        for group in active_groups:
            latest_msg = db.query(sql_func.max(GroupMessage.created_at)).filter(
                GroupMessage.group_id == group.id,
            ).scalar()

            if not latest_msg:
                continue

            # 最后一条消息必须超过30分钟（空闲期已过）
            if latest_msg > threshold:
                continue

            # 如果知识库从未构建，或者最后一条消息比上次构建更新，则重建
            if group.knowledge_updated_at and latest_msg <= group.knowledge_updated_at:
                continue

            try:
                from services.ai_service import AIService
                AIService().build_group_knowledge(group.id, db)
                rebuilt += 1
                print(f"[Knowledge Scheduler] Rebuilt for group {group.id} ({group.name})")
            except Exception as e:
                print(f"[Knowledge Scheduler] Failed for group {group.id}: {e}")

        return rebuilt

    except Exception as e:
        print(f"[Knowledge Scheduler] Error: {e}")
        return 0
    finally:
        db.close()


def start_knowledge_scheduler():
    """启动知识库自动更新调度器（后台线程）"""
    def run():
        print(f"[Knowledge Scheduler] Started, checking every {CHECK_INTERVAL_MINUTES} min")
        while True:
            try:
                count = check_and_rebuild()
                if count > 0:
                    print(f"[Knowledge Scheduler] Rebuilt {count} group(s)")
            except Exception as e:
                print(f"[Knowledge Scheduler] Scheduler error: {e}")
            time.sleep(CHECK_INTERVAL_MINUTES * 60)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return thread


_scheduler_thread = None


def init_knowledge_scheduler():
    global _scheduler_thread
    if _scheduler_thread is None:
        _scheduler_thread = start_knowledge_scheduler()
