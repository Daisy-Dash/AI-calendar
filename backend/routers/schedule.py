"""日程相关路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional
from datetime import datetime, timedelta, date
from database import get_db
from models import User, Schedule
from schemas import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from auth import get_current_user

router = APIRouter(prefix="/api/schedule", tags=["日程"])


@router.get("", response_model=list[ScheduleResponse])
def get_week_schedule(
    week: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取周日程"""
    query = db.query(Schedule).filter(Schedule.user_id == current_user.id)

    if date:
        # 获取指定日期所在周
        dt = datetime.fromisoformat(date.replace("Z", "+00:00"))
        start_of_week = dt - timedelta(days=dt.weekday())
        end_of_week = start_of_week + timedelta(days=7)
        query = query.filter(Schedule.date >= start_of_week, Schedule.date < end_of_week)

    return query.order_by(Schedule.date).all()


@router.post("", response_model=ScheduleResponse, status_code=201)
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建日程"""
    schedule = Schedule(
        user_id=current_user.id,
        task_id=data.task_id,
        title=data.title,
        date=datetime.fromisoformat(data.date.replace("Z", "+00:00")),
        color=data.color,
        note=data.note or "",
    )
    if data.start_time:
        schedule.start_time = datetime.fromisoformat(data.start_time.replace("Z", "+00:00"))
    if data.end_time:
        schedule.end_time = datetime.fromisoformat(data.end_time.replace("Z", "+00:00"))

    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新日程"""
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="日程不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            if key in ("date", "start_time", "end_time") and isinstance(value, str):
                value = datetime.fromisoformat(value.replace("Z", "+00:00"))
            setattr(schedule, key, value)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除日程"""
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="日程不存在")
    db.delete(schedule)
    db.commit()


@router.get("/month", response_model=list[ScheduleResponse])
def get_month_schedule(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取指定月份的日程"""
    from datetime import date as date_type
    import calendar

    start_date = date_type(year, month, 1)
    end_day = calendar.monthrange(year, month)[1]
    end_date = date_type(year, month, end_day)

    query = db.query(Schedule).filter(
        Schedule.user_id == current_user.id,
        Schedule.date >= start_date,
        Schedule.date <= end_date,
    )
    return query.order_by(Schedule.date).all()


@router.post("/parse", response_model=dict)
def parse_schedule(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI解析日程（接收自然语言描述，返回解析结果）"""
    text = data.get("text", "").strip()
    if not text:
        return {"original": "", "parsed": False, "suggestions": []}

    # 优先尝试本地解析（快速、无需API）
    local_result = _local_parse(text)
    if local_result and local_result.get("title"):
        return {"original": text, "parsed": True, "suggestions": [local_result]}

    # 尝试使用AI服务解析
    try:
        from services.ai_service import AIService
        ai_service = AIService()
        prompt = f"""你是一个日程解析助手。请从以下自然语言描述中提取日程信息，返回纯JSON（不要markdown包裹）。

用户输入：{text}

请严格返回如下JSON格式，不要添加任何其他文字：
{{"title":"日程标题","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM","note":"备注","color":"#FF9F43"}}

如果无法解析，返回：{{"title":"","date":""}}"""
        reply = ai_service.chat(prompt)
        import json as json_module
        # 尝试提取JSON
        reply = reply.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1].rsplit("\n", 1)[0]
        parsed = json_module.loads(reply)
        if parsed.get("title") and parsed.get("date"):
            return {"original": text, "parsed": True, "suggestions": [parsed]}
    except:
        pass

    # 最终回退
    return {
        "original": text,
        "parsed": False,
        "suggestions": [
            {"title": text, "date": datetime.now().strftime("%Y-%m-%d")}
        ],
    }


@router.get("/export", response_model=dict)
def export_ics(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出日程为ICS格式（可导入Google/Apple日历）"""
    from fastapi.responses import Response
    query = db.query(Schedule).filter(Schedule.user_id == current_user.id)

    if year and month:
        from calendar import monthrange
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])
        query = query.filter(Schedule.date >= start_date, Schedule.date <= end_date)

    schedules = query.order_by(Schedule.date).all()

    # 生成 ICS 内容
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Calendar//AI Schedule Assistant//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:AI日程协作者",
        "X-WR-TIMEZONE:Asia/Shanghai",
    ]

    for s in schedules:
        # 格式化日期为ICS格式 (YYYYMMDDTHHMMSS)
        dt_start = s.date
        if isinstance(dt_start, datetime):
            dt_str = dt_start.strftime("%Y%m%dT%H%M%S")
        else:
            dt_str = datetime.combine(
                s.date if hasattr(s.date, 'date') else datetime.strptime(str(s.date)[:10], "%Y-%m-%d").date(),
                datetime.min.time()
            ).strftime("%Y%m%dT%H%M%S")

        uid = f"ai-cal-{s.id}@aicalendar"

        ics_lines.extend([
            "BEGIN:VEVENT",
            f"DTSTART:{dt_str}",
            f"DTEND:{dt_str}",
            f"SUMMARY:{s.title}",
            f"UID:{uid}",
            f"DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%SZ')}",
        ])

        if s.note:
            # 转义ICS特殊字符
            note_escaped = s.note.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
            ics_lines.append(f"DESCRIPTION:{note_escaped}")

        if s.start_time:
            start = s.start_time if isinstance(s.start_time, datetime) else datetime.fromisoformat(str(s.start_time))
            ics_lines.append(f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}")
        if s.end_time:
            end = s.end_time if isinstance(s.end_time, datetime) else datetime.fromisoformat(str(s.end_time))
            ics_lines.append(f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}")

        ics_lines.append("END:VEVENT")

    ics_lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(ics_lines)

    # 返回文件 URL
    filename = f"ai_calendar_{year or 'all'}_{month or 'all'}.ics"
    return {"filename": filename, "content": ics_content, "count": len(schedules)}


@router.get("/export/download")
def download_ics(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """直接下载ICS文件"""
    from fastapi.responses import Response
    from calendar import monthrange

    query = db.query(Schedule).filter(Schedule.user_id == current_user.id)
    if year and month:
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])
        query = query.filter(Schedule.date >= start_date, Schedule.date <= end_date)

    schedules = query.order_by(Schedule.date).all()

    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Calendar//AI Schedule Assistant//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:AI日程协作者",
        "X-WR-TIMEZONE:Asia/Shanghai",
    ]

    for s in schedules:
        if s.date:
            if isinstance(s.date, datetime):
                dt_val = s.date
            elif hasattr(s.date, 'date'):
                dt_val = s.date
            else:
                dt_val = datetime.fromisoformat(str(s.date)[:19])

            uid = f"ai-cal-{s.id}@aicalendar"

            if s.start_time:
                st = s.start_time if isinstance(s.start_time, datetime) else datetime.fromisoformat(str(s.start_time)[:19])
            else:
                st = dt_val

            if s.end_time:
                et = s.end_time if isinstance(s.end_time, datetime) else datetime.fromisoformat(str(s.end_time)[:19])
            else:
                et = dt_val

            ics_lines.extend([
                "BEGIN:VEVENT",
                f"DTSTART:{st.strftime('%Y%m%dT%H%M%S')}",
                f"DTEND:{et.strftime('%Y%m%dT%H%M%S')}",
                f"SUMMARY:{s.title}",
                f"UID:{uid}",
                f"DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%SZ')}",
            ])
            if s.note:
                note_escaped = s.note.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
                ics_lines.append(f"DESCRIPTION:{note_escaped}")
            ics_lines.append("END:VEVENT")

    ics_lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(ics_lines)

    fn = f"ai_calendar_{year or 'all'}_{month or 'all'}.ics"
    return Response(
        content=ics_content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fn}"'},
    )


def _local_parse(text: str) -> dict | None:
    """本地中文自然语言日期解析（无需AI）"""
    import re

    today = date.today()

    # 日期映射
    day_map = {
        "今天": 0, "今日": 0, "明天": 1, "明日": 1,
        "后天": 2, "后日": 2, "大后天": 3,
        "昨天": -1, "昨日": -1, "前天": -2,
    }
    weekday_map = {
        "周一": 0, "周二": 1, "周三": 2, "周四": 3,
        "周五": 4, "周六": 5, "周日": 6, "星期天": 6,
        "星期一": 0, "星期二": 1, "星期三": 2, "星期四": 3,
        "星期五": 4, "星期六": 5, "星期日": 6,
        "下周一": 7, "下周二": 8, "下周三": 9, "下周四": 10,
        "下周五": 11, "下周六": 12, "下周日": 13,
        "下星期一": 7, "下星期二": 8, "下星期三": 9, "下星期四": 10,
        "下星期五": 11, "下星期六": 12, "下星期日": 13,
    }

    # 尝试匹配日期
    target_date = None
    for key, offset in day_map.items():
        if key in text:
            target_date = today + timedelta(days=offset)
            break

    if target_date is None:
        for key, wd in weekday_map.items():
            if key in text:
                today_wd = today.weekday()
                days_ahead = wd - today_wd
                if days_ahead < 0:
                    days_ahead += 7
                target_date = today + timedelta(days=days_ahead)
                break

    # 匹配 "N月N日" 或 "N月N号"
    if target_date is None:
        m = re.search(r"(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]", text)
        if m:
            mon, day = int(m.group(1)), int(m.group(2))
            target_date = date(today.year, mon, day)
            if target_date < today:
                target_date = date(today.year + 1, mon, day)

    # 匹配 "6月3号"
    if target_date is None:
        m = re.search(r"(\d{1,2})[./](\d{1,2})", text)
        if m:
            mon, day = int(m.group(1)), int(m.group(2))
            target_date = date(today.year, mon, day)
            if target_date < today:
                target_date = date(today.year + 1, mon, day)

    # 匹配时间
    start_time = None
    end_time = None
    # "下午3点" "3:00" "15:00"
    time_patterns = [
        (r"(早上|上午)(\d{1,2})\s*点", lambda h: h),
        (r"下午(\d{1,2})\s*点", lambda h: h + 12 if h < 12 else h),
        (r"晚上(\d{1,2})\s*点", lambda h: h + 12 if h < 12 else h),
        (r"(\d{1,2}):(\d{2})", lambda h, m: (h, m)),
    ]

    # 简单提取：找 "X点" 或 "X:XX"
    time_match = re.search(r"(\d{1,2})[：:]\s*(\d{2})", text)
    if time_match:
        h, m = int(time_match.group(1)), int(time_match.group(2))
        start_time = f"{h:02d}:{m:02d}"

    if start_time is None:
        m = re.search(r"(下午|晚上)\s*(\d{1,2})\s*点", text)
        if m:
            h = int(m.group(2))
            h = h + 12 if h < 12 else h
            start_time = f"{h:02d}:00"
        else:
            m = re.search(r"(\d{1,2})\s*点", text)
            if m:
                h = int(m.group(1))
                start_time = f"{h:02d}:00"

    # 尝试找到第二个时间作为结束时间
    times = re.findall(r"(\d{1,2})[：:]\s*(\d{2})", text)
    if len(times) >= 2:
        h2, m2 = int(times[1][0]), int(times[1][1])
        end_time = f"{h2:02d}:{m2:02d}"

    # 提取可能的标题（去除时间/日期后的剩余文本）
    title = text
    # 去除日期关键词
    for key in list(day_map.keys()) + list(weekday_map.keys()):
        title = title.replace(key, "")
    # 去除时间
    title = re.sub(r"\d{1,2}[：:]\s*\d{2}", "", title)
    title = re.sub(r"\d{1,2}\s*点(\s*\d{1,2}\s*分?)?", "", title)
    title = re.sub(r"\d{1,2}\s*月\s*\d{1,2}\s*[日号]", "", title)
    title = title.strip().rstrip("，。,.")

    # 提取颜色
    color_map = {
        "会议": "#F44336", "开会": "#F44336",
        "学习": "#4CAF50", "复习": "#4CAF50",
        "运动": "#2196F3", "健身": "#2196F3", "跑步": "#2196F3",
        "约会": "#E91E63", "聚餐": "#FF9800",
        "生日": "#9C27B0",
        "旅行": "#00BCD4", "出行": "#00BCD4",
    }
    color = "#FF9F43"
    for key, c in color_map.items():
        if key in text:
            color = c
            break

    if not title or len(title) < 1:
        return None

    return {
        "title": title or text,
        "date": target_date.strftime("%Y-%m-%d") if target_date else today.strftime("%Y-%m-%d"),
        "start_time": start_time or "",
        "end_time": end_time or "",
        "note": "",
        "color": color,
    }
