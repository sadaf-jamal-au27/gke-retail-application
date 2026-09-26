import type { FastifyInstance } from "fastify";
import type { ServiceDeps } from "@retail/service-core";

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/payment/info", async () => ({
    service: "payment-service",
    domain: "commerce",
    version: process.env.SERVICE_VERSION ?? "1.0.0",
    events: ["payment.authorized", "payment.captured"],
    note: "Auto retail captures via auto-order-service POST /v1/orders/:id/pay (local stub).",
  }));

  app.get("/v1/payment/health-detail", async () => ({
    ok: true,
    dependencies: {
      database: Boolean(deps.db),
      pubsub: Boolean(deps.publish),
    },
  }));
}
