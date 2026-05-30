import request from "supertest";
import express from "express";
import app from "../src/server";
import { applySecurityMiddleware } from "../src/config/security";
import { ValidationError, validateExpensePayload } from "../src/utils/validation";

// Match auth integration tests and keep JWT defaults stable for this suite.
process.env.NODE_ENV = process.env.NODE_ENV === "test" ? "development" : process.env.NODE_ENV;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const buildProbeApp = (): express.Express => {
  const probeApp = express();
  probeApp.use(express.json({ limit: "4kb" }));
  applySecurityMiddleware(probeApp);
  probeApp.get("/probe", (_req, res) => res.status(200).json({ ok: true }));
  return probeApp;
};

describe("Global security defenses", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("drops abusive traffic immediately with 429 using global sliding-window limiter", async () => {
    process.env.GLOBAL_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.GLOBAL_RATE_LIMIT_MAX = "2";
    process.env.GLOBAL_RATE_LIMIT_QUEUE = "0";

    const probeApp = buildProbeApp();

    const first = await request(probeApp).get("/probe");
    const second = await request(probeApp).get("/probe");
    const third = await request(probeApp).get("/probe");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.message).toContain("Too many requests");
  });

  it("redirects plaintext HTTP requests to HTTPS when test bypass is disabled", async () => {
    process.env.GLOBAL_RATE_LIMIT_MAX = "100";

    const previousWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    const probeApp = buildProbeApp();
    const response = await request(probeApp).get("/probe").set("Host", "fortress.local:3000");

    process.env.JEST_WORKER_ID = previousWorkerId;

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe("https://fortress.local:3000/probe");
  });

  it("sets HSTS headers on HTTPS requests", async () => {
    process.env.GLOBAL_RATE_LIMIT_MAX = "100";

    const probeApp = buildProbeApp();
    const response = await request(probeApp)
      .get("/probe")
      .set("X-Forwarded-Proto", "https")
      .set("Host", "fortress.local");

    expect(response.status).toBe(200);
    expect(response.headers["strict-transport-security"]).toContain("max-age=");
  });

  it("enforces request body size limits to mitigate payload-based exhaustion", async () => {
    const oversized = "A".repeat(90 * 1024);

    const response = await request(app)
      .post("/login")
      .set("Content-Type", "application/json")
      .send({ username: oversized, password: "Password123!" });

    expect(response.status).toBe(413);
  });

  it("sets auth cookies with HttpOnly, Secure, and SameSite=Strict", async () => {
    const unique = Date.now();
    const payload = {
      username: `cookie_user_${unique}`,
      email: `cookie_user_${unique}@example.com`,
      password: "Password123!",
    };

    const response = await request(app).post("/register").send(payload);

    expect(response.status).toBe(201);
    const setCookie = response.headers["set-cookie"] as string[] | undefined;

    expect(setCookie).toBeDefined();
    expect(setCookie?.some((cookie) => cookie.includes("auth_token="))).toBe(true);
    expect(setCookie?.some((cookie) => cookie.includes("HttpOnly"))).toBe(true);
    expect(setCookie?.some((cookie) => cookie.includes("Secure"))).toBe(true);
    expect(setCookie?.some((cookie) => cookie.includes("SameSite=Strict"))).toBe(true);
  });

  it("rejects unknown fields in auth DTOs to block tampering", async () => {
    const unique = Date.now();
    const response = await request(app)
      .post("/register")
      .send({
        username: `tamper_user_${unique}`,
        email: `tamper_user_${unique}@example.com`,
        password: "Password123!",
        roleId: "admin",
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(expect.arrayContaining(["Unexpected field 'roleId'."]));
  });

  it("rejects mass-assignment fields in expense DTO validation", () => {
    try {
      validateExpensePayload({
        title: "Coffee",
        amount: 3.5,
        category: "Food",
        date: "2026-05-21",
        paymentMethod: "Cash",
        notes: "Morning",
        userId: "attacker-controlled-user",
      });
      throw new Error("Validation should have failed");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual(
        expect.arrayContaining(["Unexpected field 'userId'."]),
      );
    }
  });
});


