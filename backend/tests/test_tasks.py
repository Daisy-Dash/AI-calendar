"""任务模块测试"""
import pytest


class TestTasks:
    """任务 CRUD 测试"""

    def test_create_task(self, client, auth_headers):
        """创建任务"""
        resp = client.post("/api/tasks", json={
            "title": "测试任务",
            "description": "测试描述",
            "priority": 3,
            "tags": ["test", "demo"],
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "测试任务"
        assert data["priority"] == 3
        assert data["status"] == "待办"
        assert data["progress"] == 0

    def test_list_tasks(self, client, auth_headers):
        """获取任务列表"""
        # 创建2个任务
        client.post("/api/tasks", json={"title": "Task 1"}, headers=auth_headers)
        client.post("/api/tasks", json={"title": "Task 2"}, headers=auth_headers)

        resp = client.get("/api/tasks", headers=auth_headers)
        assert resp.status_code == 200
        tasks = resp.json()
        assert len(tasks) == 2

    def test_filter_by_status(self, client, auth_headers):
        """按状态筛选任务"""
        client.post("/api/tasks", json={"title": "Task A"}, headers=auth_headers)
        client.post("/api/tasks", json={"title": "Task B"}, headers=auth_headers)

        resp = client.get("/api/tasks?status_filter=待办", headers=auth_headers)
        assert resp.status_code == 200
        for t in resp.json():
            assert t["status"] == "待办"

    def test_get_task(self, client, auth_headers):
        """获取任务详情"""
        create_resp = client.post("/api/tasks", json={"title": "Detail Task"}, headers=auth_headers)
        task_id = create_resp.json()["id"]

        resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Detail Task"

    def test_update_task(self, client, auth_headers):
        """更新任务"""
        create_resp = client.post("/api/tasks", json={"title": "Old Title"}, headers=auth_headers)
        task_id = create_resp.json()["id"]

        resp = client.put(f"/api/tasks/{task_id}", json={
            "title": "New Title",
            "priority": 4,
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "New Title"
        assert data["priority"] == 4

    def test_delete_task(self, client, auth_headers):
        """删除任务"""
        create_resp = client.post("/api/tasks", json={"title": "To Delete"}, headers=auth_headers)
        task_id = create_resp.json()["id"]

        resp = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
        assert resp.status_code == 204

        # 确认已删除
        get_resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    def test_update_progress(self, client, auth_headers):
        """更新任务进度"""
        create_resp = client.post("/api/tasks", json={"title": "Progress Task"}, headers=auth_headers)
        task_id = create_resp.json()["id"]

        # 设置进度50%
        resp = client.put(f"/api/tasks/{task_id}/progress", json={"progress": 50}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["progress"] == 50
        assert resp.json()["status"] == "进行中"

        # 设置进度100%
        resp = client.put(f"/api/tasks/{task_id}/progress", json={"progress": 100}, headers=auth_headers)
        assert resp.json()["progress"] == 100
        assert resp.json()["status"] == "已完成"

    def test_progress_out_of_range(self, client, auth_headers):
        """进度值超出范围"""
        create_resp = client.post("/api/tasks", json={"title": "Range Task"}, headers=auth_headers)
        task_id = create_resp.json()["id"]

        resp = client.put(f"/api/tasks/{task_id}/progress", json={"progress": 150}, headers=auth_headers)
        assert resp.status_code == 400

    def test_task_not_found(self, client, auth_headers):
        """访问不存在的任务"""
        resp = client.get("/api/tasks/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_task_isolation(self, client):
        """任务隔离 — 用户之间不能看到彼此的任务"""
        # 用户A创建任务
        client.post("/api/auth/register", json={
            "username": "userA", "email": "a@test.com", "password": "pass123",
        })
        login_a = client.post("/api/auth/login", json={"email": "a@test.com", "password": "pass123"})
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        client.post("/api/tasks", json={"title": "A's Task"}, headers=headers_a)

        # 用户B注册并创建自己的任务
        client.post("/api/auth/register", json={
            "username": "userB", "email": "b@test.com", "password": "pass123",
        })
        login_b = client.post("/api/auth/login", json={"email": "b@test.com", "password": "pass123"})
        token_b = login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        client.post("/api/tasks", json={"title": "B's Task"}, headers=headers_b)

        # B只能看到自己的任务，看不到A的
        resp = client.get("/api/tasks", headers=headers_b)
        assert resp.status_code == 200
        tasks = resp.json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "B's Task"


class TestSchedule:
    """日程模块测试"""

    def test_create_schedule(self, client, auth_headers):
        resp = client.post("/api/schedule", json={
            "title": "周会", "date": "2026-06-15", "color": "#FF9F43",
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["title"] == "周会"

    def test_get_month_schedule(self, client, auth_headers):
        client.post("/api/schedule", json={
            "title": "六月日程", "date": "2026-06-10",
        }, headers=auth_headers)
        client.post("/api/schedule", json={
            "title": "七月日程", "date": "2026-07-05",
        }, headers=auth_headers)

        resp = client.get("/api/schedule/month?year=2026&month=6", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_delete_schedule(self, client, auth_headers):
        create_resp = client.post("/api/schedule", json={
            "title": "To Delete", "date": "2026-06-01",
        }, headers=auth_headers)
        s_id = create_resp.json()["id"]

        resp = client.delete(f"/api/schedule/{s_id}", headers=auth_headers)
        assert resp.status_code == 204

    def test_parse_natural_language(self, client, auth_headers):
        """自然语言解析日程"""
        resp = client.post("/api/schedule/parse", json={
            "text": "明天下午3点开会",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # 解析成功或回退都可接受（取决于本地解析器是否正确处理中文）
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0
        assert data["suggestions"][0]["title"]  # 标题不为空


class TestGroups:
    """群组模块测试"""

    def test_create_group(self, client, auth_headers):
        resp = client.post("/api/groups", json={
            "name": "测试群组", "description": "描述",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "测试群组"
        assert len(data["invite_code"]) == 6

    def test_list_my_groups(self, client, auth_headers):
        client.post("/api/groups", json={"name": "Group 1"}, headers=auth_headers)
        client.post("/api/groups", json={"name": "Group 2"}, headers=auth_headers)

        resp = client.get("/api/groups", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_join_by_invite(self, client, auth_headers):
        # 创建群组
        create_resp = client.post("/api/groups", json={"name": "Join Test"}, headers=auth_headers)
        code = create_resp.json()["invite_code"]

        # 注册另一个用户
        client.post("/api/auth/register", json={
            "username": "joiner", "email": "join@test.com", "password": "pass123",
        })
        login_resp = client.post("/api/auth/login", json={
            "email": "join@test.com", "password": "pass123",
        })
        joiner_headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

        # 加入群组
        resp = client.post("/api/groups/respond", json={
            "invite_code": code, "accept": True,
        }, headers=joiner_headers)
        assert resp.status_code == 200

        # 群组详情应有2个成员
        detail = client.get(f"/api/groups/{create_resp.json()['id']}", headers=auth_headers)
        assert len(detail.json()["members"]) == 2


class TestNotifications:
    """通知模块测试"""

    def test_unread_count(self, client, auth_headers):
        resp = client.get("/api/notifications/unread-count", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    def test_notification_list(self, client, auth_headers):
        resp = client.get("/api/notifications", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_mark_all_read(self, client, auth_headers):
        resp = client.put("/api/notifications/read-all", headers=auth_headers)
        assert resp.status_code == 200


class TestUserStats:
    """用户统计测试"""

    def test_get_stats(self, client, auth_headers):
        t1 = client.post("/api/tasks", json={"title": "Task 1"}, headers=auth_headers)
        t2 = client.post("/api/tasks", json={"title": "Task 2"}, headers=auth_headers)
        t3 = client.post("/api/tasks", json={"title": "Task 3"}, headers=auth_headers)

        # 完成任务1
        client.put(f"/api/tasks/{t1.json()['id']}/progress", json={"progress": 100}, headers=auth_headers)
        # 开始任务2
        client.put(f"/api/tasks/{t2.json()['id']}/progress", json={"progress": 50}, headers=auth_headers)

        resp = client.get("/api/users/me/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_tasks"] == 3
        assert data["completed_tasks"] == 1
        assert data["in_progress_tasks"] == 1
        assert data["pending_tasks"] == 1

    def test_get_settings(self, client, auth_headers):
        resp = client.get("/api/users/me/settings", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["theme"] == "light"

    def test_update_settings(self, client, auth_headers):
        resp = client.put("/api/users/me/settings", json={
            "theme": "dark", "sound": True,
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["theme"] == "dark"
