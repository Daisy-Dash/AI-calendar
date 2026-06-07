"""
数据库备份与恢复工具
用于代码更新时保护用户数据不丢失

用法:
  备份: python db_backup.py backup
  恢复: python db_backup.py restore
  查看备份列表: python db_backup.py list
"""
import shutil
import os
import sys
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "ai_calendar.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")


def backup():
    """备份当前数据库"""
    if not os.path.exists(DB_PATH):
        print("数据库文件不存在，无需备份")
        return None

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"ai_calendar_{timestamp}.db")
    shutil.copy2(DB_PATH, backup_path)

    # 保留最近10个备份
    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        reverse=True,
    )
    for old_backup in backups[10:]:
        os.remove(os.path.join(BACKUP_DIR, old_backup))
        print(f"  清理旧备份: {old_backup}")

    size_mb = os.path.getsize(backup_path) / 1024 / 1024
    print(f"备份成功: {backup_path} ({size_mb:.2f} MB)")
    return backup_path


def restore(backup_name=None):
    """恢复数据库（默认恢复最新备份）"""
    if not os.path.exists(BACKUP_DIR):
        print("没有找到备份目录")
        return False

    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        reverse=True,
    )
    if not backups:
        print("没有可用的备份")
        return False

    if backup_name:
        if backup_name not in backups:
            print(f"备份 {backup_name} 不存在")
            return False
        target = backup_name
    else:
        target = backups[0]

    backup_path = os.path.join(BACKUP_DIR, target)
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    shutil.copy2(backup_path, DB_PATH)
    print(f"恢复成功: {target} -> {DB_PATH}")
    return True


def list_backups():
    """列出所有备份"""
    if not os.path.exists(BACKUP_DIR):
        print("没有备份")
        return

    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        reverse=True,
    )
    if not backups:
        print("没有备份")
        return

    print(f"共 {len(backups)} 个备份:")
    for b in backups:
        path = os.path.join(BACKUP_DIR, b)
        size_mb = os.path.getsize(path) / 1024 / 1024
        print(f"  {b}  ({size_mb:.2f} MB)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd == "backup":
        backup()
    elif cmd == "restore":
        name = sys.argv[2] if len(sys.argv) > 2 else None
        restore(name)
    elif cmd == "list":
        list_backups()
    else:
        print(f"未知命令: {cmd}")
        print("可用命令: backup, restore, list")
