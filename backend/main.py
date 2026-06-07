"""AI日程协作者 - 后端入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理 — 自动备份 + 数据库迁移"""
    import os as _os

    # 每次启动前自动备份数据库（保护用户数据）
    db_path = _os.path.join(_os.path.dirname(__file__), "data", "ai_calendar.db")
    if _os.path.exists(db_path):
        try:
            from db_backup import backup
            backup()
            print("[Backup] Database backed up before migration")
        except Exception as e:
            print(f"[Backup] Auto-backup skipped: {e}")

    # 使用 Alembic 迁移（保留已有数据）
    try:
        from alembic.config import Config as AlembicConfig
        from alembic import command
        alembic_ini = _os.path.join(_os.path.dirname(__file__), "alembic.ini")
        alembic_cfg = AlembicConfig(alembic_ini)
        command.upgrade(alembic_cfg, "head")
        print("[Migration] Database up to date")
    except Exception as e:
        # 回退：如果 Alembic 不可用，使用 create_all
        print(f"[Migration] Alembic failed ({e}), falling back to create_all")
        init_db()

    # 安全地添加可能缺失的新列（兼容旧数据库）
    try:
        from safe_migrate import safe_migrate
        safe_migrate()
        print("[Migration] Safe column check done")
    except Exception as e:
        print(f"[Migration] Safe migrate skipped: {e}")

    # 启动DDL提醒调度器
    from services.ddl_reminder import init_scheduler, check_ddl_and_notify
    init_scheduler()
    check_ddl_and_notify()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI日程协作者 - 后端API服务",
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
from routers.auth import router as auth_router
from routers.tasks import router as tasks_router
from routers.schedule import router as schedule_router
from routers.ai import router as ai_router
from routers.users import router as users_router
from routers.groups import router as groups_router
from routers.notifications import router as notifications_router
from routers.ws import router as ws_router
from routers.friends import router as friends_router
from routers.messages import router as messages_router
from routers.upload import router as upload_router

app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(schedule_router)
app.include_router(ai_router)
app.include_router(users_router)
app.include_router(groups_router)
app.include_router(notifications_router)
app.include_router(ws_router)
app.include_router(friends_router)
app.include_router(messages_router)
app.include_router(upload_router)


@app.get("/")
def root():
    """根路径 - 健康检查 + 使用指南"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": {
            "frontend": "http://localhost:5173",
            "api_docs": "http://localhost:8000/docs",
            "openapi": "http://localhost:8000/openapi.json",
        },
        "ai_provider": settings.AI_PROVIDER or "mock (配置API Key后启用)",
        "endpoints": {
            "auth": "/api/auth",
            "tasks": "/api/tasks",
            "schedule": "/api/schedule",
            "groups": "/api/groups",
            "ai": "/api/ai",
            "users": "/api/users",
            "notifications": "/api/notifications",
            "websocket": "/ws",
        },
    }


@app.get("/api/health")
def health_check():
    """健康检查"""
    return {"status": "ok"}


@app.get("/api/data/majors")
def get_majors_data():
    """获取专业和技能标签数据"""
    import json
    import os
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "major_tags_database.json")
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"majors": [], "assignment_templates": {}}
