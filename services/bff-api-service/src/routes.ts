import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ServiceDeps } from "@retail/service-core";

const u = (key: string, port: number) => process.env[key] ?? `http://127.0.0.1:${port}`;

const URLS = {
  catalog: u("VEHICLE_CATALOG_URL", 3101),
  dealer: u("DEALERSHIP_URL", 3102),
  inventory: u("VEHICLE_INVENTORY_URL", 3103),
  pricing: u("AUTO_PRICING_URL", 3104),
  testDrive: u("TEST_DRIVE_URL", 3105),
  cart: u("AUTO_CART_URL", 3106),
  order: u("AUTO_ORDER_URL", 3107),
  finance: u("AUTO_FINANCE_URL", 3108),
  service: u("SERVICE_APPOINTMENT_URL", 3109),
  tradeIn: u("TRADE_IN_URL", 3110),
  auth: u("AUTH_URL", 3111),
};

type AuthUser = { id: string; email: string; fullName: string; phone: string | null };

async function proxyJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  return res.json();
}

async function proxyStatus(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  const authHeader = (req.headers.authorization as string) ?? "";
  const me = await proxyStatus(`${URLS.auth}/v1/auth/me`, {
    headers: { authorization: authHeader },
  });
  if (me.status !== 200) {
    reply.code(401).send({ error: "login_required" });
    return null;
  }
  return (me.body as { user: AuthUser }).user;
}

export function registerRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.get("/v1/bff/info", async () => ({
    service: "bff-api-service",
    domain: "automobile-retail",
    microservices: Object.keys(URLS),
  }));

  app.post("/v1/storefront/auth/register", async (req, reply) => {
    const { status, body } = await proxyStatus(`${URLS.auth}/v1/auth/register`, {
      method: "POST",
      body: JSON.stringify(req.body ?? {}),
    });
    return reply.code(status).send(body);
  });

  app.post("/v1/storefront/auth/login", async (req, reply) => {
    const { status, body } = await proxyStatus(`${URLS.auth}/v1/auth/login`, {
      method: "POST",
      body: JSON.stringify(req.body ?? {}),
    });
    return reply.code(status).send(body);
  });

  app.get("/v1/storefront/auth/me", async (req, reply) => {
    const { status, body } = await proxyStatus(`${URLS.auth}/v1/auth/me`, {
      headers: { authorization: (req.headers.authorization as string) ?? "" },
    });
    return reply.code(status).send(body);
  });

  app.post("/v1/storefront/auth/logout", async (req, reply) => {
    const { status, body } = await proxyStatus(`${URLS.auth}/v1/auth/logout`, {
      method: "POST",
      headers: { authorization: (req.headers.authorization as string) ?? "" },
    });
    return reply.code(status).send(body);
  });

  app.get("/v1/storefront/realtime", async () => {
    try {
      return await proxyJson(`${URLS.catalog}/v1/platform/stats`);
    } catch {
      return { vehiclesListed: 0, unitsInStock: 0, testDrivesToday: 0, openOrders: 0, timestamp: new Date().toISOString(), _unavailable: true };
    }
  });

  app.get("/v1/storefront/vehicles", async (req) => {
    const q = new URLSearchParams(req.query as Record<string, string>).toString();
    return proxyJson(`${URLS.catalog}/v1/vehicles${q ? `?${q}` : ""}`, {
      headers: { "x-session-id": (req.headers["x-session-id"] as string) ?? "" },
    });
  });

  app.get("/v1/storefront/vehicles/:id", async (req) => {
    const { id } = req.params as { id: string };
    const session = (req.headers["x-session-id"] as string) ?? crypto.randomUUID();
    const [vehicle, live, inventory] = await Promise.all([
      proxyJson(`${URLS.catalog}/v1/vehicles/${id}`),
      proxyJson(`${URLS.catalog}/v1/vehicles/${id}/realtime`, { headers: { "x-session-id": session } }),
      proxyJson(`${URLS.inventory}/v1/inventory?vehicleId=${id}`),
    ]);
    return { vehicle, live, inventory };
  });

  app.get("/v1/storefront/dealerships", async (req) => {
    const q = new URLSearchParams(req.query as Record<string, string>).toString();
    return proxyJson(`${URLS.dealer}/v1/dealerships${q ? `?${q}` : ""}`);
  });

  app.post("/v1/storefront/pricing/quote", async (req) =>
    proxyJson(`${URLS.pricing}/v1/pricing/quote`, { method: "POST", body: JSON.stringify(req.body ?? {}) })
  );

  app.post("/v1/storefront/finance/emi", async (req) =>
    proxyJson(`${URLS.finance}/v1/finance/emi`, { method: "POST", body: JSON.stringify(req.body ?? {}) })
  );

  app.post("/v1/storefront/finance/apply", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = req.body as {
      vehicleId: string;
      onRoadPriceInr: number;
      downPaymentInr: number;
      tenureMonths: number;
      aprPercent?: number;
      orderId?: string;
    };
    const { status, body: result } = await proxyStatus(`${URLS.finance}/v1/finance/apply`, {
      method: "POST",
      body: JSON.stringify({ ...body, customerUserId: user.id }),
    });
    return reply.code(status).send(result);
  });

  app.get("/v1/storefront/finance/applications/mine", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { status, body } = await proxyStatus(
      `${URLS.finance}/v1/finance/applications?customerUserId=${encodeURIComponent(user.id)}`
    );
    return reply.code(status).send(body);
  });

  app.post("/v1/storefront/test-drives", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;

    const body = req.body as {
      vehicleId: string;
      dealershipId: string;
      customerPhone?: string;
      slot: string;
    };
    const { status, body: booking } = await proxyStatus(`${URLS.testDrive}/v1/test-drives`, {
      method: "POST",
      body: JSON.stringify({
        vehicleId: body.vehicleId,
        dealershipId: body.dealershipId,
        slot: body.slot,
        customerName: user.fullName,
        customerPhone: body.customerPhone || user.phone || "",
        customerUserId: user.id,
      }),
    });
    return reply.code(status).send(booking);
  });

  app.get("/v1/storefront/test-drives/mine", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { status, body } = await proxyStatus(
      `${URLS.testDrive}/v1/test-drives?customerUserId=${encodeURIComponent(user.id)}`
    );
    return reply.code(status).send(body);
  });

  app.post("/v1/storefront/service/appointments", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;

    const body = req.body as {
      customerName?: string;
      phone?: string;
      vehicleReg: string;
      serviceType?: string;
      slot: string;
      dealershipId: string;
    };
    const { status, body: appt } = await proxyStatus(`${URLS.service}/v1/service/appointments`, {
      method: "POST",
      body: JSON.stringify({
        vehicleReg: body.vehicleReg,
        serviceType: body.serviceType ?? "Periodic service",
        slot: body.slot,
        dealershipId: body.dealershipId,
        customerName: body.customerName || user.fullName,
        phone: body.phone || user.phone || "",
        customerUserId: user.id,
      }),
    });
    return reply.code(status).send(appt);
  });

  app.get("/v1/storefront/service/appointments/mine", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { status, body } = await proxyStatus(
      `${URLS.service}/v1/service/appointments?customerUserId=${encodeURIComponent(user.id)}`
    );
    return reply.code(status).send(body);
  });

  app.post("/v1/storefront/trade-in/estimate", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = req.body as Record<string, unknown>;
    const { status, body: estimate } = await proxyStatus(`${URLS.tradeIn}/v1/trade-in/estimate`, {
      method: "POST",
      body: JSON.stringify({ ...body, customerUserId: user.id }),
    });
    return reply.code(status).send(estimate);
  });

  app.post("/v1/storefront/orders/:id/pay", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const body = req.body as { method?: string };
    const { status, body: result } = await proxyStatus(`${URLS.order}/v1/orders/${encodeURIComponent(id)}/pay`, {
      method: "POST",
      body: JSON.stringify({ customerId: user.id, method: body.method ?? "upi" }),
    });
    return reply.code(status).send(result);
  });

  app.post("/v1/storefront/carts", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = req.body as { vehicleId?: string };
    const { status, body: cart } = await proxyStatus(`${URLS.cart}/v1/carts`, {
      method: "POST",
      body: JSON.stringify({ customerId: user.id, vehicleId: body.vehicleId }),
    });
    return reply.code(status).send(cart);
  });

  app.get("/v1/storefront/cart", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { status, body } = await proxyStatus(`${URLS.cart}/v1/carts/by-customer/${encodeURIComponent(user.id)}`);
    return reply.code(status).send(body);
  });

  app.get("/v1/storefront/orders/mine", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { status, body } = await proxyStatus(
      `${URLS.order}/v1/orders?customerId=${encodeURIComponent(user.id)}`
    );
    return reply.code(status).send(body);
  });

  app.post("/v1/storefront/checkout", async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;

    const body = req.body as {
      vehicleId: string;
      dealershipId: string;
      onRoadPriceInr?: number;
      cartId?: string;
    };

    if (!body.vehicleId || !body.dealershipId) {
      return reply.code(400).send({ error: "vehicle_and_dealership_required" });
    }

    const cartRes = await proxyStatus(`${URLS.cart}/v1/carts`, {
      method: "POST",
      body: JSON.stringify({ customerId: user.id, vehicleId: body.vehicleId }),
    });
    if (cartRes.status >= 400) {
      return reply.code(cartRes.status).send(cartRes.body);
    }
    const cart = cartRes.body as { id: string; accessoriesTotalInr?: number };

    const quote = (await proxyJson(`${URLS.pricing}/v1/pricing/quote`, {
      method: "POST",
      body: JSON.stringify({ vehicleId: body.vehicleId }),
    })) as { onRoadPriceInr?: number; error?: string };

    if (!quote?.onRoadPriceInr) {
      return reply.code(400).send({ error: quote?.error ?? "quote_failed" });
    }

    const totalInr = (body.onRoadPriceInr ?? quote.onRoadPriceInr) + (cart.accessoriesTotalInr ?? 0);
    const orderRes = await proxyStatus(`${URLS.order}/v1/orders`, {
      method: "POST",
      body: JSON.stringify({
        customerId: user.id,
        vehicleId: body.vehicleId,
        dealershipId: body.dealershipId,
        totalInr,
        cartId: body.cartId ?? cart.id,
      }),
    });
    if (orderRes.status >= 400) {
      return reply.code(orderRes.status).send(orderRes.body);
    }

    await deps.publish("bff.checkout.completed", {
      orderId: (orderRes.body as { id?: string }).id,
      customerId: user.id,
    });
    return { quote, cart, order: orderRes.body };
  });
}
