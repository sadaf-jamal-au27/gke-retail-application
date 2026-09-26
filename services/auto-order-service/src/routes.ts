import type { FastifyInstance } from "fastify";
import type { ServiceDeps } from "@retail/service-core";
import { createOrder, getOrder, listOrdersForCustomer, payOrder, requirePool } from "@retail/automobile-db";

function statusOf(err: unknown) {
  return typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode: number }).statusCode) : 500;
}

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/auto-order/info", async () => ({
    service: "auto-order-service",
    domain: "automobile-commerce",
    persistence: "postgresql",
  }));

  app.post("/v1/orders", async (req, reply) => {
    const body = req.body as {
      customerId: string;
      vehicleId: string;
      dealershipId: string;
      totalInr: number;
      cartId?: string;
    };
    try {
      const order = await createOrder(requirePool(deps.db), body);
      await deps.publish("order.placed", order);
      return order;
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "order_failed" });
    }
  });

  app.post("/v1/orders/:id/pay", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { customerId: string; method?: string };
    if (!body.customerId) return reply.code(400).send({ error: "customer_id_required" });
    try {
      const result = await payOrder(requirePool(deps.db), {
        orderId: id,
        customerId: body.customerId,
        method: body.method,
      });
      if (!result.alreadyPaid && result.payment) {
        await deps.publish("payment.captured", result.payment);
      }
      return result;
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "payment_failed" });
    }
  });

  app.get("/v1/orders/:id", async (req, reply) => {
    const order = await getOrder(requirePool(deps.db), (req.params as { id: string }).id);
    if (!order) return reply.code(404).send({ error: "not_found" });
    return order;
  });

  app.get("/v1/orders", async (req, reply) => {
    const { customerId } = req.query as { customerId?: string };
    if (!customerId) return reply.code(400).send({ error: "customer_id_required" });
    return { items: await listOrdersForCustomer(requirePool(deps.db), customerId) };
  });
}
