import type { FastifyInstance } from "fastify";
import type { ServiceDeps } from "@retail/service-core";
import { addCartLine, getCart, getOrCreateCartForCustomer, requirePool } from "@retail/automobile-db";

function statusOf(err: unknown) {
  return typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode: number }).statusCode) : 500;
}

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/auto-cart/info", async () => ({
    service: "auto-cart-service",
    domain: "automobile-commerce",
    persistence: "postgresql",
  }));

  app.post("/v1/carts", async (req, reply) => {
    const body = req.body as { customerId?: string; vehicleId?: string };
    if (!body.customerId?.trim()) {
      return reply.code(400).send({ error: "customer_id_required" });
    }
    try {
      const cart = await getOrCreateCartForCustomer(requirePool(deps.db), body.customerId.trim(), body.vehicleId);
      return cart;
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "cart_failed" });
    }
  });

  app.get("/v1/carts/:id", async (req, reply) => {
    const cart = await getCart(requirePool(deps.db), (req.params as { id: string }).id);
    if (!cart) return reply.code(404).send({ error: "not_found" });
    return cart;
  });

  app.get("/v1/carts/by-customer/:customerId", async (req, reply) => {
    try {
      const cart = await getOrCreateCartForCustomer(
        requirePool(deps.db),
        (req.params as { customerId: string }).customerId
      );
      return cart;
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "cart_failed" });
    }
  });

  app.post("/v1/carts/:id/accessories", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const line = req.body as { sku: string; name: string; priceInr: number; qty: number };
    try {
      const cart = await addCartLine(requirePool(deps.db), id, line);
      if (!cart) return reply.code(404).send({ error: "not_found" });
      return cart;
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "line_failed" });
    }
  });
}
