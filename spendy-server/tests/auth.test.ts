import request from "supertest";
import express from "express";
import speakeasy from "speakeasy";
import { extractUser } from "../src/utils/permissions";
import { createAuthRateLimiter } from "../src/config/security";

// Ensure we use real Prisma client during these integration-style tests.
process.env.NODE_ENV = process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

import app from "../src/server";

describe("Auth endpoints", () => {
  const unique = Date.now();
  const testUser = {
    username: `testuser_${unique}`,
    email: `testuser_${unique}@example.com`,
    password: "Password123!",
  };

  it("registers a new user and returns a token", async () => {
    const res = await request(app).post("/register").send(testUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("rejects duplicate registration", async () => {
    const res = await request(app).post("/register").send(testUser);
    expect(res.status).toBe(400);
  });

  it("logs in with correct password and returns token", async () => {
    const res = await request(app).post("/login").send({ username: testUser.username, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.username).toBe(testUser.username);
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/login").send({ username: testUser.username, password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("protects routes using token", async () => {
    const tempApp = express();
    tempApp.use(express.json());
    tempApp.use(extractUser);
    tempApp.get("/test/protected", (req: any, res: any) => {
      if (req.user) return res.status(200).json({ ok: true, user: req.user });
      return res.status(401).json({ ok: false });
    });

    const login = await request(app).post("/login").send({ username: testUser.username, password: testUser.password });
    const token = login.body.token as string;

    const resOk = await request(tempApp).get("/test/protected").set("Authorization", `Bearer ${token}`);
    expect(resOk.status).toBe(200);
    expect(resOk.body.ok).toBe(true);

    const resBad = await request(tempApp).get("/test/protected").set("Authorization", "Bearer invalidtoken");
    expect(resBad.status).toBe(401);
  });

  it("sets helmet security headers", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("resets password with generated token", async () => {
    const forgotRes = await request(app).post("/forgot-password").send({ email: testUser.email });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body).toHaveProperty("message");
    expect(forgotRes.body).toHaveProperty("devResetToken");

    const invalidReset = await request(app)
      .post("/reset-password")
      .send({ token: "invalid-token", newPassword: "NewPass123!" });
    expect(invalidReset.status).toBe(400);

    const resetRes = await request(app)
      .post("/reset-password")
      .send({ token: forgotRes.body.devResetToken, newPassword: "NewPass123!" });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app).post("/login").send({ username: testUser.username, password: testUser.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/login").send({ username: testUser.username, password: "NewPass123!" });
    expect(newLogin.status).toBe(200);
  });

  it("enables 2FA and requires TOTP during login", async () => {
    const loginRes = await request(app).post("/login").send({ username: testUser.username, password: "NewPass123!" });
    expect(loginRes.status).toBe(200);

    const authToken = loginRes.body.token as string;
    const setupRes = await request(app).post("/2fa/setup").set("Authorization", `Bearer ${authToken}`).send({});
    expect(setupRes.status).toBe(200);
    expect(setupRes.body).toHaveProperty("base32");

    const setupToken = speakeasy.totp({
      secret: setupRes.body.base32,
      encoding: "base32",
    });

    const verifyRes = await request(app)
      .post("/2fa/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ secret: setupRes.body.base32, token: setupToken });
    expect(verifyRes.status).toBe(200);

    const loginMissingTotp = await request(app)
      .post("/login")
      .send({ username: testUser.username, password: "NewPass123!" });
    expect(loginMissingTotp.status).toBe(401);

    const currentTotp = speakeasy.totp({
      secret: setupRes.body.base32,
      encoding: "base32",
    });

    const loginWithTotp = await request(app)
      .post("/login")
      .send({ username: testUser.username, password: "NewPass123!", totp: currentTotp });
    expect(loginWithTotp.status).toBe(200);
  });
});

describe("Auth rate limiter", () => {
  it("returns 429 after max auth attempts in a window", async () => {
    const limitedApp = express();
    limitedApp.use(express.json());
    limitedApp.use("/login", createAuthRateLimiter({ windowMs: 60_000, max: 2 }));
    limitedApp.post("/login", (_req, res) => res.status(401).json({ message: "invalid" }));

    const first = await request(limitedApp).post("/login").send({ username: "a", password: "b" });
    const second = await request(limitedApp).post("/login").send({ username: "a", password: "b" });
    const third = await request(limitedApp).post("/login").send({ username: "a", password: "b" });

    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.body.message).toContain("Too many authentication requests");
  });
});


