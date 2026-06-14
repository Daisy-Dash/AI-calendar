"""应用配置管理"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # 应用基础配置
    APP_NAME: str = "AI日程协作者"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # 数据库配置
    DATABASE_URL: str = "sqlite:///./data/ai_calendar.db"

    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-in-production-ai-calendar-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7天

    # AI API 配置（支持 Claude / GPT / DeepSeek）
    AI_PROVIDER: str = "deepseek"  # "claude" | "gpt" | "deepseek"
    CLAUDE_API_KEY: Optional[str] = None
    CLAUDE_API_MODEL: str = "claude-sonnet-4-20250514"
    GPT_API_KEY: Optional[str] = None
    GPT_API_MODEL: str = "gpt-4o"
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_API_MODEL: str = "deepseek-chat"

    # Tavily 搜索 API
    TAVILY_API_KEY: Optional[str] = "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"

    # CORS 配置
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://*.vercel.app",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
