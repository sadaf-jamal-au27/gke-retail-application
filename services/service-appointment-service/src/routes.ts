import type { FastifyInstance } from "fastify";
import type { ServiceDeps } from "@retail/service-core";
import { bookService, listServiceForCustomer, requirePool } from "@retail/automobile-db";

function statusOf(err: unknown) {
  return typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode: number }).statusCode) : 500;
}

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/service-appointment/info", async () => ({
    service: "service-appointment-service",
    domain: "automobile-aftersales",
    persistence: "postgresql",
  }));

  app.post("/v1/service/appointments", async (req, reply) => {
    const body = req.body as {
      customerName: string;
      phone: string;
      vehicleReg: string;
      serviceType: string;
      slot: string;
      dealershipId: string;
      customerUserId?: string;
    };
    try {
      const appt = await bookService(requirePool(deps.db), body);
      await deps.publish("service.scheduled", appt);
      return appt;
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "booking_failed" });
    }
  });

  app.get("/v1/service/appointments", async (req, reply) => {
    const { customerUserId } = req.query as { customerUserId?: string };
    if (!customerUserId) return reply.code(400).send({ error: "customer_user_id_required" });
    return { items: await listServiceForCustomer(requirePool(deps.db), customerUserId) };
  });
}
