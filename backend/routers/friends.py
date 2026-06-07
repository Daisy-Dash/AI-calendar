"""好友系统路由"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from database import get_db
from models import User
from models.friendship import Friendship
from auth import get_current_user

router = APIRouter(prefix="/api/friends", tags=["好友"])


@router.get("/search")
def search_users(
    q: str = Query(..., min_length=1, description="搜索昵称或邮箱"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """搜索用户（按昵称或邮箱）"""
    keyword = f"%{q}%"
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            User.username.ilike(keyword),
            User.email.ilike(keyword),
        )
    ).limit(20).all()

    # 查询当前用户与这些人的好友关系
    user_ids = [u.id for u in users]
    friendships = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id.in_(user_ids)),
            and_(Friendship.friend_id == current_user.id, Friendship.user_id.in_(user_ids)),
        )
    ).all()

    # 构建关系映射
    relation_map = {}
    for f in friendships:
        other_id = f.friend_id if f.user_id == current_user.id else f.user_id
        if f.status == "accepted":
            relation_map[other_id] = "friend"
        elif f.status == "pending":
            if f.user_id == current_user.id:
                relation_map[other_id] = "pending_sent"
            else:
                relation_map[other_id] = "pending_received"

    result = []
    for u in users:
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "avatar": u.avatar or "",
            "major": u.major or [],
            "skills": u.skills or [],
            "relation": relation_map.get(u.id, "none"),
        })
    return result


@router.post("/request")
def send_friend_request(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """发送好友请求"""
    friend_id = data.get("friend_id")
    if not friend_id:
        raise HTTPException(status_code=400, detail="缺少 friend_id")
    if friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能添加自己为好友")

    # 检查用户是否存在
    friend = db.query(User).filter(User.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 检查是否已存在关系
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id),
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=400, detail="已经是好友了")
        if existing.status == "pending":
            # 如果对方发给我的请求，直接接受
            if existing.user_id == friend_id:
                existing.status = "accepted"
                db.commit()
                return {"message": f"已和 {friend.username} 成为好友", "status": "accepted"}
            raise HTTPException(status_code=400, detail="已发送过好友请求，等待对方确认")
        if existing.status == "rejected":
            # 重新发送
            existing.status = "pending"
            existing.user_id = current_user.id
            existing.friend_id = friend_id
            db.commit()
            return {"message": f"已重新向 {friend.username} 发送好友请求"}

    # 创建好友请求
    friendship = Friendship(
        user_id=current_user.id,
        friend_id=friend_id,
        status="pending",
    )
    db.add(friendship)
    db.commit()

    # 发送通知
    try:
        from routers.notifications import create_notification
        create_notification(
            db=db,
            user_id=friend_id,
            type="friend",
            title="好友请求",
            message=f"{current_user.username} 想添加你为好友",
        )
    except Exception:
        pass

    return {"message": f"已向 {friend.username} 发送好友请求"}


@router.get("/requests")
def get_friend_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取收到的好友请求"""
    requests = db.query(Friendship).filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending",
    ).order_by(Friendship.created_at.desc()).all()

    result = []
    for r in requests:
        user = db.query(User).filter(User.id == r.user_id).first()
        if user:
            result.append({
                "id": r.id,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "avatar": user.avatar or "",
                "major": user.major or [],
                "skills": user.skills or [],
                "created_at": r.created_at.isoformat() if r.created_at else "",
            })
    return result


@router.put("/requests/{request_id}")
def respond_friend_request(
    request_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """接受或拒绝好友请求"""
    accept = data.get("accept", False)

    friendship = db.query(Friendship).filter(
        Friendship.id == request_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending",
    ).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="请求不存在或已处理")

    friendship.status = "accepted" if accept else "rejected"
    db.commit()

    # 通知对方
    try:
        from routers.notifications import create_notification
        sender = db.query(User).filter(User.id == friendship.user_id).first()
        if accept:
            create_notification(
                db=db,
                user_id=friendship.user_id,
                type="friend",
                title="好友请求已通过",
                message=f"{current_user.username} 已接受你的好友请求",
            )
    except Exception:
        pass

    return {"message": "已接受" if accept else "已拒绝", "status": friendship.status}


@router.get("")
def list_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取好友列表"""
    friendships = db.query(Friendship).filter(
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id,
        ),
        Friendship.status == "accepted",
    ).all()

    result = []
    for f in friendships:
        friend_id = f.friend_id if f.user_id == current_user.id else f.user_id
        user = db.query(User).filter(User.id == friend_id).first()
        if user:
            result.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "avatar": user.avatar or "",
                "major": user.major or [],
                "skills": user.skills or [],
                "friendship_id": f.id,
            })
    return result


@router.delete("/{friend_id}")
def remove_friend(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除好友"""
    friendship = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id),
        ),
        Friendship.status == "accepted",
    ).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="好友关系不存在")

    db.delete(friendship)
    db.commit()
    return {"message": "已删除好友"}
