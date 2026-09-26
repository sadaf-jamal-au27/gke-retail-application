import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ServiceDeps } from "@retail/service-core";

const SESSION_DAYS = 7;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim() || null;
}

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  password_hash: string;
};

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/auth/info", async () => ({
    service: "auth-service",
    domain: "identity",
    version: process.env.SERVICE_VERSION ?? "1.0.0",
    mode: "database_sessions",
  }));

  app.post("/v1/auth/register", async (req, reply) => {
    if (!deps.db) return reply.code(503).send({ error: "database_unavailable" });

    const body = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
      phone?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const phone = body.phone?.trim() || null;

    if (!email.includes("@") || password.length < 8 || fullName.length < 2) {
      return reply.code(400).send({
        error: "invalid_input",
        message: "email, fullName (2+ chars), and password (8+ chars) required",
      });
    }

    const existing = await deps.db.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rowCount) {
      return reply.code(409).send({ error: "email_taken" });
    }

    const id = `usr_${randomBytes(8).toString("hex")}`;
    const passwordHash = hashPassword(password);
    await deps.db.query(
      `INSERT INTO users (id, email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4, $5)`,
      [id, email, passwordHash, fullName, phone]
    );

    const session = await createSession(deps, id);
    await deps.publish("user.authenticated", { userId: id, email, via: "register" });

    return {
      accessToken: session.token,
      tokenType: "Bearer",
      expiresIn: session.expiresIn,
      user: { id, email, fullName, phone },
    };
  });

  app.post("/v1/auth/login", async (req, reply) => {
    if (!deps.db) return reply.code(503).send({ error: "database_unavailable" });

    const body = req.body as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    const result = await deps.db.query<UserRow>(
      `SELECT id, email, full_name, phone, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const session = await createSession(deps, user.id);
    await deps.publish("user.authenticated", { userId: user.id, email: user.email, via: "login" });

    return {
      accessToken: session.token,
      tokenType: "Bearer",
      expiresIn: session.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
      },
    };
  });

  app.get("/v1/auth/me", async (req, reply) => {
    const user = await resolveUser(deps, bearer(req));
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { user };
  });

  app.post("/v1/auth/logout", async (req, reply) => {
    if (!deps.db) return reply.code(503).send({ error: "database_unavailable" });
    const token = bearer(req);
    if (!token) return reply.code(401).send({ error: "unauthorized" });

    const result = await deps.db.query<{ user_id: string }>(
      `DELETE FROM sessions WHERE token_hash = $1 RETURNING user_id`,
      [hashToken(token)]
    );
    if (result.rowCount) {
      await deps.publish("user.logout", { userId: result.rows[0].user_id });
    }
    return { ok: true };
  });
}

async function createSession(deps: ServiceDeps, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const id = `ses_${randomBytes(8).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await deps.db!.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [id, userId, hashToken(token), expiresAt.toISOString()]
  );
  return {
    token,
    expiresIn: SESSION_DAYS * 24 * 60 * 60,
  };
}

async function resolveUser(deps: ServiceDeps, token: string | null) {
  if (!deps.db || !token) return null;
  const result = await deps.db.query<{
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
  }>(
    `SELECT u.id, u.email, u.full_name, u.phone
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
  };
}
