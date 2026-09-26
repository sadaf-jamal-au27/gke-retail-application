import type { FastifyInstance } from "fastify";
import type { ServiceDeps } from "@retail/service-core";
import { createTestDrive, listTestDrives, requirePool } from "@retail/automobile-db";

function statusOf(err: unknown) {
  return typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode: number }).statusCode) : 500;
}

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/test-drive/info", async () => ({
    service: "test-drive-service",
    domain: "automobile-experience",
    persistence: "postgresql",
  }));

  app.post("/v1/test-drives", async (req, reply) => {
    const body = req.body as {
      vehicleId: string;
      dealershipId: string;
      customerName: string;
      customerPhone: string;
      slot: string;
      customerUserId?: string;
    };
    try {
      const booking = await createTestDrive(requirePool(deps.db), body);
      await deps.publish("testdrive.booked", booking);
      return booking;
    } catch (err) {
      return reply.code(statusOf(err)).send({ error: err instanceof Error ? err.message : "booking_failed" });
    }
  });

  app.get("/v1/test-drives", async (req) => {
    const { phone, customerUserId } = req.query as { phone?: string; customerUserId?: string };
    return { items: await listTestDrives(requirePool(deps.db), phone, customerUserId) };
  });
}
