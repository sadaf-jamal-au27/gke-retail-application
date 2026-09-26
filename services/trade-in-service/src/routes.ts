import type { FastifyInstance } from "fastify";
import type { ServiceDeps } from "@retail/service-core";
import { tradeInEstimate, requirePool } from "@retail/automobile-db";

function statusOf(err: unknown) {
  return typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode: number }).statusCode) : 500;
}

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/trade-in/info", async () => ({
    service: "trade-in-service",
    domain: "automobile-tradein",
    persistence: "postgresql",
  }));

  app.post("/v1/trade-in/estimate", async (req, reply) => {
    const body = req.body as {
      make: string;
      model: string;
      year: number;
      kmDriven: number;
      condition: string;
      customerUserId?: string;
    };
    try {
      return await tradeInEstimate(requirePool(deps.db), body);
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "estimate_failed" });
    }
  });
}
