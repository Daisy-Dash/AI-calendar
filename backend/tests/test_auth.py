"""认证模块测试"""
import pytest


class TestAuth:
    """用户注册和登录测试"""

    def test_register_success(self, client):
        """注册成功"""
        resp = client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "pass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "new@example.com"

    def test_register_duplicate_email(self, client):
        """重复邮箱注册"""
        client.post("/api/auth/register", json={
            "username": "user1", "email": "dup@example.com", "password": "pass123",
        })
        resp = client.post("/api/auth/register", json={
            "username": "user2", "email": "dup@example.com", "password": "pass123",
        })
        assert resp.status_code == 400
        assert "已注册" in resp.json()["detail"]

    def test_register_duplicate_username(self, client):
        """重复用户名注册"""
        client.post("/api/auth/register", json={
            "username": "same", "email": "a@a.com", "password": "pass123",
        })
        resp = client.post("/api/auth/register", json={
            "username": "same", "email": "b@b.com", "password": "pass123",
        })
        assert resp.status_code == 400

    def test_login_success(self, client):
        """登录成功"""
        client.post("/api/auth/register", json={
            "username": "loginuser", "email": "login@example.com", "password": "mypass",
        })
        resp = client.post("/api/auth/login", json={
            "email": "login@example.com", "password": "mypass",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        """密码错误"""
        client.post("/api/auth/register", json={
            "username": "pwuser", "email": "pw@example.com", "password": "correct",
        })
        resp = client.post("/api/auth/login", json={
            "email": "pw@example.com", "password": "wrong",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        """不存在的用户"""
        resp = client.post("/api/auth/login", json={
            "email": "nobody@example.com", "password": "whatever",
        })
        assert resp.status_code == 401

    def test_unauthorized_access(self, client):
        """未登录访问受保护端点"""
        resp = client.get("/api/tasks")
        assert resp.status_code == 401

    def test_get_current_user(self, client, auth_headers):
        """获取当前用户信息"""
        resp = client.get("/api/users/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == "testuser"
