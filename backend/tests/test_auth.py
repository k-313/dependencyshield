def test_register_success(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@example.com", "password": "SecurePassword123!"},
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert "access_token" in res.cookies


def test_register_duplicate_rejected(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "password": "SecurePassword123!"},
    )
    res2 = client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "password": "AnotherPassword456!"},
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_login_success(client, user_a):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": user_a.email, "password": "Password123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["id"] == user_a.id


def test_login_invalid_password(client, user_a):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": user_a.email, "password": "WrongPassword!"},
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_auth_me_protected(client, auth_headers_user_a, user_a):
    # Without token
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401

    # With Bearer token
    auth_res = client.get("/api/v1/auth/me", headers=auth_headers_user_a)
    assert auth_res.status_code == 200
    assert auth_res.json()["id"] == user_a.id


def test_logout(client):
    res = client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    assert "Successfully logged out" in res.json()["message"]
