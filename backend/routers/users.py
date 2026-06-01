"""用户相关路由"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserResponse
from auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["用户"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新当前用户信息"""
    allowed_fields = {"username", "avatar", "bio"}
    for key, value in data.items():
        if key in allowed_fields and value is not None:
            setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user
