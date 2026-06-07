"""
安全数据库迁移工具
每次启动时检查并添加可能缺失的新列，不会删除已有数据

当程序员添加了新的数据库字段时，只需在 MIGRATIONS 列表中添加一条记录，
系统就会自动检测并添加缺失的列，完全不影响已有数据。
"""
from sqlalchemy import inspect, text
from database import engine

# 迁移定义：(表名, 列名, SQL类型, 默认值)
# 程序员新增字段时，在这里加一行就行
MIGRATIONS = [
    # Group 表新增字段
    ("groups", "status", "VARCHAR(20)", "'gathering'"),
    ("groups", "project_brief", "VARCHAR(2000)", "''"),

    # 以后新增的字段写在这里，例如：
    # ("users", "phone", "VARCHAR(20)", "''"),
    # ("tasks", "checkpoint_date", "DATETIME", "NULL"),
]


def safe_migrate():
    """安全地添加缺失的列，不会影响已有数据"""
    insp = inspect(engine)
    tables = insp.get_table_names()

    added = []
    for table, column, col_type, default in MIGRATIONS:
        if table not in tables:
            continue

        existing_cols = [c["name"] for c in insp.get_columns(table)]
        if column in existing_cols:
            continue

        # 添加缺失的列
        default_clause = f"DEFAULT {default}" if default else ""
        sql = f'ALTER TABLE {table} ADD COLUMN {column} {col_type} {default_clause}'
        with engine.connect() as conn:
            conn.execute(text(sql))
            conn.commit()
        added.append(f"{table}.{column}")

    if added:
        print(f"[SafeMigrate] Added columns: {', '.join(added)}")
    else:
        print("[SafeMigrate] All columns up to date")
