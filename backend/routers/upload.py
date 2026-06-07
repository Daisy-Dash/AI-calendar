"""文件上传路由 - 支持图片/PDF/Word/PPT文本提取"""
import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from auth import get_current_user
from models import User

router = APIRouter(prefix="/api/upload", tags=["文件上传"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 支持的文件类型
ALLOWED_TYPES = {
    "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/msword",  # .doc
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    "application/vnd.ms-powerpoint",  # .ppt
    "text/plain",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def extract_text_from_file(filepath: str, content_type: str) -> str:
    """从文件中提取文本内容"""
    text = ""

    try:
        if content_type == "text/plain":
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

        elif content_type == "application/pdf":
            try:
                import PyPDF2
                with open(filepath, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages[:20]:  # 最多20页
                        text += page.extract_text() or ""
            except ImportError:
                text = "[PDF文件] 需要安装 PyPDF2 才能提取内容"

        elif content_type in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            try:
                import docx
                doc = docx.Document(filepath)
                for para in doc.paragraphs:
                    text += para.text + "\n"
            except ImportError:
                text = "[Word文档] 需要安装 python-docx 才能提取内容"

        elif content_type in (
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-powerpoint",
        ):
            try:
                from pptx import Presentation
                prs = Presentation(filepath)
                for slide in prs.slides:
                    for shape in slide.shapes:
                        if shape.has_text_frame:
                            for para in shape.text_frame.paragraphs:
                                text += para.text + "\n"
                    text += "\n---\n"
            except ImportError:
                text = "[PPT文件] 需要安装 python-pptx 才能提取内容"

        elif content_type.startswith("image/"):
            # 图片返回路径，让AI服务做多模态理解
            text = f"[图片文件: {os.path.basename(filepath)}]"

    except Exception as e:
        text = f"[文件解析失败: {str(e)[:100]}]"

    return text.strip()


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """上传文件并提取文本内容"""
    # 检查文件类型
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file.content_type}。支持: 图片/PDF/Word/PPT/TXT"
        )

    # 读取文件内容检查大小
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件过大，最大10MB")

    # 保存文件
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    with open(filepath, "wb") as f:
        f.write(contents)

    # 提取文本
    extracted_text = extract_text_from_file(filepath, file.content_type)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(contents),
        "extracted_text": extracted_text[:5000],  # 限制长度
        "file_path": f"/uploads/{safe_name}",
    }


@router.post("/files")
async def upload_multiple_files(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    """批量上传文件并提取文本"""
    results = []
    all_text = []

    for file in files[:5]:  # 最多5个文件
        if file.content_type not in ALLOWED_TYPES:
            results.append({"filename": file.filename, "error": "不支持的文件类型"})
            continue

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            results.append({"filename": file.filename, "error": "文件过大"})
            continue

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = f"{timestamp}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, safe_name)

        with open(filepath, "wb") as f:
            f.write(contents)

        extracted = extract_text_from_file(filepath, file.content_type)
        all_text.append(f"【{file.filename}】\n{extracted}")

        results.append({
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(contents),
            "extracted_text": extracted[:2000],
        })

    return {
        "files": results,
        "combined_text": "\n\n".join(all_text)[:8000],
    }
