"""AI日程协作者 - 后端入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    init_db()
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

app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(schedule_router)
app.include_router(ai_router)
app.include_router(users_router)
app.include_router(groups_router)
app.include_router(notifications_router)
app.include_router(ws_router)


@app.get("/")
def root():
    """根路径 - 健康检查"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/api/health")
def health_check():
    """健康检查"""
    return {"status": "ok"}
