import type { FastifyInstance } from "fastify";
import type { ServiceDeps } from "@retail/service-core";
import { financeQuote, applyForFinance, listFinanceForCustomer, requirePool } from "@retail/automobile-db";

function statusOf(err: unknown) {
  return typeof err === "object" && err && "statusCode" in err
    ? Number((err as { statusCode: number }).statusCode)
    : 500;
}

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/auto-finance/info", async () => ({
    service: "auto-finance-service",
    domain: "automobile-finance",
    persistence: "postgresql",
  }));

  /** Stateless EMI calculator — no auth, no DB. */
  app.post("/v1/finance/emi", async (req, reply) => {
    const body = req.body as {
      onRoadPriceInr: number;
      downPaymentInr: number;
      tenureMonths: number;
      aprPercent?: number;
    };
    const quote = financeQuote(body);
    if (!quote) return reply.code(400).send({ error: "invalid_input" });
    return quote;
  });

  /** Submit a finance application — persisted to DB, linked to user + optional order. */
  app.post("/v1/finance/apply", async (req, reply) => {
    const body = req.body as {
      customerUserId: string;
      vehicleId: string;
      onRoadPriceInr: number;
      downPaymentInr: number;
      tenureMonths: number;
      aprPercent?: number;
      orderId?: string;
    };
    try {
      const app_ = await applyForFinance(requirePool(deps.db), body);
      await deps.publish("finance.applied", app_);
      return app_;
    } catch (err) {
      return reply
        .code(statusOf(err))
        .send({ error: err instanceof Error ? err.message : "application_failed" });
    }
  });

  /** List finance applications for a customer. */
  app.get("/v1/finance/applications", async (req, reply) => {
    const { customerUserId } = req.query as { customerUserId?: string };
    if (!customerUserId) return reply.code(400).send({ error: "customer_user_id_required" });
    return { items: await listFinanceForCustomer(requirePool(deps.db), customerUserId) };
  });
}
