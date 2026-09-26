import type pg from "pg";

export type VehicleRow = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  body_type: string;
  fuel_type: string;
  transmission: string;
  base_price_inr: string;
  image_url: string;
  features: unknown;
  rating: string;
  description: string | null;
};

export function mapVehicle(r: VehicleRow) {
  return {
    id: r.id,
    slug: r.slug,
    make: r.make,
    model: r.model,
    year: r.year,
    bodyType: r.body_type,
    fuelType: r.fuel_type,
    transmission: r.transmission,
    basePriceInr: Number(r.base_price_inr),
    imageUrl: r.image_url,
    features: r.features as string[],
    rating: Number(r.rating),
    description: r.description ?? "",
  };
}

export async function listVehicles(
  pool: pg.Pool,
  filter: { make?: string; fuelType?: string; bodyType?: string; maxPriceInr?: number }
) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.make) {
    params.push(filter.make);
    clauses.push(`LOWER(make) = LOWER($${params.length})`);
  }
  if (filter.fuelType) {
    params.push(filter.fuelType);
    clauses.push(`fuel_type = $${params.length}`);
  }
  if (filter.bodyType) {
    params.push(filter.bodyType);
    clauses.push(`body_type = $${params.length}`);
  }
  if (filter.maxPriceInr) {
    params.push(filter.maxPriceInr);
    clauses.push(`base_price_inr <= $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query<VehicleRow>(`SELECT * FROM vehicles ${where} ORDER BY make, model`, params);
  return rows.map(mapVehicle);
}

export async function getVehicle(pool: pg.Pool, idOrSlug: string) {
  const { rows } = await pool.query<VehicleRow>(`SELECT * FROM vehicles WHERE id = $1 OR slug = $1`, [idOrSlug]);
  return rows[0] ? mapVehicle(rows[0]) : null;
}

export async function recordPageView(pool: pg.Pool, vehicleId: string, sessionId: string) {
  await pool.query(`INSERT INTO vehicle_page_views (vehicle_id, session_id) VALUES ($1, $2)`, [vehicleId, sessionId]);
}

export async function liveViewers(pool: pg.Pool, vehicleId: string) {
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(DISTINCT session_id)::text AS c FROM vehicle_page_views
     WHERE vehicle_id = $1 AND viewed_at > NOW() - INTERVAL '15 minutes'`,
    [vehicleId]
  );
  return Number(rows[0]?.c ?? 0);
}

export async function platformStats(pool: pg.Pool) {
  const [v, d, stock, td, ord] = await Promise.all([
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM vehicles`),
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM dealerships`),
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM inventory_units WHERE status = 'available'`),
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM test_drive_bookings WHERE slot::date = CURRENT_DATE`),
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM auto_orders WHERE status <> 'delivered'`),
  ]);
  return {
    vehiclesListed: Number(v.rows[0].c),
    dealerships: Number(d.rows[0].c),
    unitsInStock: Number(stock.rows[0].c),
    testDrivesToday: Number(td.rows[0].c),
    openOrders: Number(ord.rows[0].c),
    timestamp: new Date().toISOString(),
  };
}

export async function listDealerships(pool: pg.Pool, city?: string) {
  const { rows } = city
    ? await pool.query(`SELECT * FROM dealerships WHERE LOWER(city) LIKE LOWER($1) ORDER BY city`, [`%${city}%`])
    : await pool.query(`SELECT * FROM dealerships ORDER BY city`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    phone: r.phone,
    lat: r.lat,
    lng: r.lng,
    openHours: r.open_hours,
  }));
}

export async function getDealership(pool: pg.Pool, id: string) {
  const { rows } = await pool.query(`SELECT * FROM dealerships WHERE id = $1`, [id]);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    phone: r.phone,
    lat: r.lat,
    lng: r.lng,
    openHours: r.open_hours,
  };
}

export async function listInventory(pool: pg.Pool, vehicleId?: string, dealershipId?: string) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (vehicleId) {
    params.push(vehicleId);
    clauses.push(`vehicle_id = $${params.length}`);
  }
  if (dealershipId) {
    params.push(dealershipId);
    clauses.push(`dealership_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(`SELECT * FROM inventory_units ${where}`, params);
  return rows.map((u) => ({
    vin: u.vin,
    vehicleId: u.vehicle_id,
    dealershipId: u.dealership_id,
    color: u.color,
    status: u.status,
    arrivalDate: u.arrival_date,
  }));
}

export async function priceQuoteFromDb(
  pool: pg.Pool,
  input: { vehicleId: string; insuranceInr?: number; registrationInr?: number; discountInr?: number }
) {
  const vehicle = await getVehicle(pool, input.vehicleId);
  if (!vehicle) return null;
  const insurance = input.insuranceInr ?? Math.round(vehicle.basePriceInr * 0.042);
  const registration = input.registrationInr ?? (vehicle.basePriceInr > 3000000 ? 125000 : 85000);
  const discount = input.discountInr ?? 0;
  const onRoad = vehicle.basePriceInr + insurance + registration - discount;
  const emiMonths = 60;
  const emiInr = Math.round((onRoad * 1.095) / emiMonths);
  return {
    vehicleId: input.vehicleId,
    basePriceInr: vehicle.basePriceInr,
    insuranceInr: insurance,
    registrationInr: registration,
    discountInr: discount,
    onRoadPriceInr: onRoad,
    emiInr,
    emiMonths,
    aprPercent: 9.5,
  };
}

export function financeQuote(input: { onRoadPriceInr: number; downPaymentInr: number; tenureMonths: number; aprPercent?: number }) {
  const apr = input.aprPercent ?? 9.5;
  const principal = input.onRoadPriceInr - input.downPaymentInr;
  if (principal <= 0) return null;
  const monthlyRate = apr / 100 / 12;
  const pow = Math.pow(1 + monthlyRate, input.tenureMonths);
  const emi = Math.round((principal * monthlyRate * pow) / (pow - 1));
  return {
    principalInr: principal,
    emiInr: emi,
    tenureMonths: input.tenureMonths,
    aprPercent: apr,
    totalPayableInr: emi * input.tenureMonths + input.downPaymentInr,
  };
}

export async function applyForFinance(
  pool: pg.Pool,
  input: {
    customerUserId: string;
    vehicleId: string;
    onRoadPriceInr: number;
    downPaymentInr: number;
    tenureMonths: number;
    aprPercent?: number;
    orderId?: string;
  }
) {
  if (!input.customerUserId?.trim() || !input.vehicleId?.trim()) {
    const err = new Error("invalid_finance_application");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
  if (input.downPaymentInr >= input.onRoadPriceInr) {
    const err = new Error("down_payment_exceeds_price");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
  if (input.tenureMonths < 6 || input.tenureMonths > 120) {
    const err = new Error("invalid_tenure");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  const quote = financeQuote(input)!;
  const id = `fin-${crypto.randomUUID().slice(0, 8)}`;

  // Auto-approve if principal < 2 Cr (dev stub logic)
  const status = quote.principalInr < 20_000_000 ? "approved" : "pending";

  await pool.query(
    `INSERT INTO finance_applications
       (id, customer_user_id, order_id, vehicle_id, on_road_price_inr, down_payment_inr, tenure_months,
        apr_percent, principal_inr, emi_inr, total_payable_inr, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      input.customerUserId,
      input.orderId ?? null,
      input.vehicleId,
      input.onRoadPriceInr,
      input.downPaymentInr,
      input.tenureMonths,
      quote.aprPercent,
      quote.principalInr,
      quote.emiInr,
      quote.totalPayableInr,
      status,
    ]
  );

  return {
    id,
    customerUserId: input.customerUserId,
    orderId: input.orderId ?? null,
    vehicleId: input.vehicleId,
    onRoadPriceInr: input.onRoadPriceInr,
    downPaymentInr: input.downPaymentInr,
    tenureMonths: input.tenureMonths,
    aprPercent: quote.aprPercent,
    principalInr: quote.principalInr,
    emiInr: quote.emiInr,
    totalPayableInr: quote.totalPayableInr,
    status,
    createdAt: new Date().toISOString(),
  };
}

export async function listFinanceForCustomer(pool: pg.Pool, customerUserId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM finance_applications WHERE customer_user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [customerUserId]
  );
  return rows.map((r) => ({
    id: r.id as string,
    customerUserId: r.customer_user_id as string,
    orderId: (r.order_id as string) ?? null,
    vehicleId: r.vehicle_id as string,
    onRoadPriceInr: Number(r.on_road_price_inr),
    downPaymentInr: Number(r.down_payment_inr),
    tenureMonths: Number(r.tenure_months),
    aprPercent: Number(r.apr_percent),
    principalInr: Number(r.principal_inr),
    emiInr: Number(r.emi_inr),
    totalPayableInr: Number(r.total_payable_inr),
    status: r.status as string,
    createdAt: r.created_at as string,
  }));
}

export async function createTestDrive(
  pool: pg.Pool,
  data: {
    vehicleId: string;
    dealershipId: string;
    customerName: string;
    customerPhone: string;
    slot: string;
    customerUserId?: string;
  }
) {
  const vehicle = await getVehicle(pool, data.vehicleId);
  if (!vehicle) {
    const err = new Error("vehicle_not_found");
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }
  const dealer = await getDealership(pool, data.dealershipId);
  if (!dealer) {
    const err = new Error("dealership_not_found");
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }
  if (!data.customerName?.trim() || data.customerPhone.replace(/\D/g, "").length < 10) {
    const err = new Error("invalid_customer");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
  const slotDate = new Date(data.slot);
  if (Number.isNaN(slotDate.getTime()) || slotDate.getTime() < Date.now() - 60_000) {
    const err = new Error("invalid_slot");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  const id = `td-${crypto.randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO test_drive_bookings (id, vehicle_id, dealership_id, customer_name, customer_phone, slot, customer_user_id)
     VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7)`,
    [
      id,
      data.vehicleId,
      data.dealershipId,
      data.customerName.trim(),
      data.customerPhone.trim(),
      data.slot,
      data.customerUserId ?? null,
    ]
  );
  return {
    id,
    vehicleId: data.vehicleId,
    dealershipId: data.dealershipId,
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone.trim(),
    slot: data.slot,
    customerUserId: data.customerUserId ?? null,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
}

export async function listTestDrives(pool: pg.Pool, phone?: string, customerUserId?: string) {
  if (customerUserId) {
    const { rows } = await pool.query(
      `SELECT * FROM test_drive_bookings WHERE customer_user_id = $1 ORDER BY created_at DESC`,
      [customerUserId]
    );
    return rows;
  }
  const { rows } = phone
    ? await pool.query(`SELECT * FROM test_drive_bookings WHERE customer_phone = $1 ORDER BY created_at DESC`, [phone])
    : await pool.query(`SELECT * FROM test_drive_bookings ORDER BY created_at DESC LIMIT 50`);
  return rows;
}

export async function getOrCreateCartForCustomer(pool: pg.Pool, customerId: string, vehicleId?: string) {
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM auto_carts WHERE customer_id = $1 ORDER BY updated_at DESC LIMIT 1`,
    [customerId]
  );
  if (existing.rows[0]) {
    if (vehicleId) {
      const vehicle = await getVehicle(pool, vehicleId);
      if (!vehicle) {
        const err = new Error("vehicle_not_found");
        (err as Error & { statusCode: number }).statusCode = 404;
        throw err;
      }
      await pool.query(`UPDATE auto_carts SET vehicle_id = $1, updated_at = NOW() WHERE id = $2`, [
        vehicleId,
        existing.rows[0].id,
      ]);
    }
    return getCart(pool, existing.rows[0].id);
  }
  if (vehicleId) {
    const vehicle = await getVehicle(pool, vehicleId);
    if (!vehicle) {
      const err = new Error("vehicle_not_found");
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }
  }
  return upsertCart(pool, { id: crypto.randomUUID(), customerId, vehicleId });
}

export async function upsertCart(pool: pg.Pool, cart: { id: string; customerId: string; vehicleId?: string }) {
  await pool.query(
    `INSERT INTO auto_carts (id, customer_id, vehicle_id) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id, updated_at = NOW()`,
    [cart.id, cart.customerId, cart.vehicleId ?? null]
  );
  return getCart(pool, cart.id);
}

export async function getCart(pool: pg.Pool, id: string) {
  const cart = await pool.query(`SELECT * FROM auto_carts WHERE id = $1`, [id]);
  if (!cart.rows[0]) return null;
  const lines = await pool.query(`SELECT * FROM auto_cart_lines WHERE cart_id = $1`, [id]);
  const accessories = lines.rows.map((l) => ({
    sku: l.sku,
    name: l.name,
    priceInr: Number(l.price_inr),
    qty: l.qty,
  }));
  const accessoriesTotal = accessories.reduce((sum, l) => sum + l.priceInr * l.qty, 0);
  return {
    id: cart.rows[0].id,
    customerId: cart.rows[0].customer_id,
    vehicleId: cart.rows[0].vehicle_id,
    accessories,
    accessoriesTotalInr: accessoriesTotal,
    updatedAt: cart.rows[0].updated_at,
  };
}

export async function addCartLine(
  pool: pg.Pool,
  cartId: string,
  line: { sku: string; name: string; priceInr: number; qty: number }
) {
  if (!line.sku?.trim() || !line.name?.trim() || line.priceInr < 0 || line.qty < 1) {
    const err = new Error("invalid_line");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
  const cart = await getCart(pool, cartId);
  if (!cart) return null;
  await pool.query(
    `INSERT INTO auto_cart_lines (cart_id, sku, name, price_inr, qty) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (cart_id, sku) DO UPDATE SET qty = EXCLUDED.qty, price_inr = EXCLUDED.price_inr, name = EXCLUDED.name`,
    [cartId, line.sku.trim(), line.name.trim(), line.priceInr, line.qty]
  );
  return getCart(pool, cartId);
}

export async function createOrder(
  pool: pg.Pool,
  input: { customerId: string; vehicleId: string; dealershipId: string; totalInr: number; cartId?: string }
) {
  const vehicle = await getVehicle(pool, input.vehicleId);
  if (!vehicle) {
    const err = new Error("vehicle_not_found");
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }
  const dealer = await getDealership(pool, input.dealershipId);
  if (!dealer) {
    const err = new Error("dealership_not_found");
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }
  if (!input.customerId || input.totalInr <= 0) {
    const err = new Error("invalid_order");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inv = await client.query<{ vin: string }>(
      `SELECT vin FROM inventory_units
       WHERE vehicle_id = $1 AND dealership_id = $2 AND status = 'available'
       ORDER BY arrival_date ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [input.vehicleId, input.dealershipId]
    );
    const reservedVin = inv.rows[0]?.vin ?? null;
    if (reservedVin) {
      await client.query(`UPDATE inventory_units SET status = 'reserved' WHERE vin = $1`, [reservedVin]);
    }

    const id = `ord-${crypto.randomUUID().slice(0, 8)}`;
    await client.query(
      `INSERT INTO auto_orders (id, customer_id, vehicle_id, dealership_id, total_inr, status, cart_id, reserved_vin)
       VALUES ($1,$2,$3,$4,$5,'confirmed',$6,$7)`,
      [id, input.customerId, input.vehicleId, input.dealershipId, input.totalInr, input.cartId ?? null, reservedVin]
    );
    await client.query("COMMIT");
    return {
      id,
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      dealershipId: input.dealershipId,
      totalInr: input.totalInr,
      cartId: input.cartId ?? null,
      reservedVin,
      status: "confirmed",
      paymentStatus: "pending",
      paidAt: null,
      createdAt: new Date().toISOString(),
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getOrder(pool: pg.Pool, id: string) {
  const { rows } = await pool.query(`SELECT * FROM auto_orders WHERE id = $1`, [id]);
  const r = rows[0];
  if (!r) return null;
  return mapOrder(r);
}

export async function listOrdersForCustomer(pool: pg.Pool, customerId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM auto_orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [customerId]
  );
  return rows.map(mapOrder);
}

function mapOrder(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    customerId: r.customer_id as string,
    vehicleId: r.vehicle_id as string,
    dealershipId: r.dealership_id as string,
    totalInr: Number(r.total_inr),
    status: r.status as string,
    cartId: (r.cart_id as string) ?? null,
    reservedVin: (r.reserved_vin as string) ?? null,
    paymentStatus: (r.payment_status as string) ?? "pending",
    paidAt: (r.paid_at as string) ?? null,
    createdAt: r.created_at as string,
  };
}

/** Local/dev payment stub — records a successful UPI/card payment against an order. */
export async function payOrder(
  pool: pg.Pool,
  input: { orderId: string; customerId: string; method?: string }
) {
  const order = await getOrder(pool, input.orderId);
  if (!order) {
    const err = new Error("order_not_found");
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }
  if (order.customerId !== input.customerId) {
    const err = new Error("forbidden");
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
  if (order.paymentStatus === "paid") {
    return { order, payment: null, alreadyPaid: true };
  }

  const method = input.method ?? "upi";
  if (!["upi", "card", "netbanking"].includes(method)) {
    const err = new Error("invalid_payment_method");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paymentId = `pay-${crypto.randomUUID().slice(0, 8)}`;
    const providerRef = `stub_${method}_${Date.now()}`;
    await client.query(
      `INSERT INTO payments (id, order_id, customer_id, amount_inr, method, status, provider_ref)
       VALUES ($1,$2,$3,$4,$5,'captured',$6)`,
      [paymentId, order.id, input.customerId, order.totalInr, method, providerRef]
    );
    await client.query(
      `UPDATE auto_orders SET payment_status = 'paid', paid_at = NOW(), status = 'paid' WHERE id = $1`,
      [order.id]
    );
    if (order.reservedVin) {
      await client.query(`UPDATE inventory_units SET status = 'sold' WHERE vin = $1 AND status = 'reserved'`, [
        order.reservedVin,
      ]);
    }
    await client.query("COMMIT");
    const updated = await getOrder(pool, order.id);
    return {
      alreadyPaid: false,
      order: updated,
      payment: {
        id: paymentId,
        orderId: order.id,
        amountInr: order.totalInr,
        method,
        status: "captured",
        providerRef,
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function tradeInEstimate(
  pool: pg.Pool,
  input: {
    make: string;
    model: string;
    year: number;
    kmDriven: number;
    condition: string;
    customerUserId?: string;
  }
) {
  if (!input.make?.trim() || !input.model?.trim() || input.year < 1990 || input.kmDriven < 0) {
    const err = new Error("invalid_trade_in");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
  const { rows } = await pool.query<{ base: string }>(
    `SELECT base_price_inr::text AS base FROM vehicles WHERE LOWER(make)=LOWER($1) AND LOWER(model) LIKE LOWER($2) LIMIT 1`,
    [input.make, `%${input.model}%`]
  );
  const refBase = Number(rows[0]?.base ?? 600000);
  const age = new Date().getFullYear() - input.year;
  const dep = refBase * (0.12 * Math.max(age, 0));
  const kmPenalty = Math.max(0, input.kmDriven - 25000) * 4;
  const factor = input.condition === "excellent" ? 1.05 : input.condition === "good" ? 1 : 0.9;
  const valueInr = Math.max(80000, Math.round((refBase - dep - kmPenalty) * factor));
  const id = `ti-${crypto.randomUUID().slice(0, 8)}`;
  const validUntil = new Date(Date.now() + 7 * 86400000);
  await pool.query(
    `INSERT INTO trade_in_estimates (id, make, model, year, km_driven, condition, value_inr, valid_until, customer_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      input.make.trim(),
      input.model.trim(),
      input.year,
      input.kmDriven,
      input.condition,
      valueInr,
      validUntil.toISOString(),
      input.customerUserId ?? null,
    ]
  );
  return {
    id,
    make: input.make.trim(),
    model: input.model.trim(),
    year: input.year,
    kmDriven: input.kmDriven,
    condition: input.condition,
    valueInr,
    validUntil: validUntil.toISOString(),
  };
}

export async function bookService(
  pool: pg.Pool,
  input: {
    customerName: string;
    phone: string;
    vehicleReg: string;
    serviceType: string;
    slot: string;
    dealershipId: string;
    customerUserId?: string;
  }
) {
  const dealer = await getDealership(pool, input.dealershipId);
  if (!dealer) {
    const err = new Error("dealership_not_found");
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }
  if (!input.customerName?.trim() || input.phone.replace(/\D/g, "").length < 10 || !input.vehicleReg?.trim()) {
    const err = new Error("invalid_service_booking");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
  const slotDate = new Date(input.slot);
  if (Number.isNaN(slotDate.getTime()) || slotDate.getTime() < Date.now() - 60_000) {
    const err = new Error("invalid_slot");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  const id = `svc-${crypto.randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO service_appointments (id, customer_name, phone, vehicle_reg, service_type, slot, dealership_id, customer_user_id)
     VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7,$8)`,
    [
      id,
      input.customerName.trim(),
      input.phone.trim(),
      input.vehicleReg.trim().toUpperCase(),
      input.serviceType,
      input.slot,
      input.dealershipId,
      input.customerUserId ?? null,
    ]
  );
  return {
    id,
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    vehicleReg: input.vehicleReg.trim().toUpperCase(),
    serviceType: input.serviceType,
    slot: input.slot,
    dealershipId: input.dealershipId,
    customerUserId: input.customerUserId ?? null,
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };
}

export async function listServiceForCustomer(pool: pg.Pool, customerUserId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM service_appointments WHERE customer_user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [customerUserId]
  );
  return rows.map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    phone: r.phone,
    vehicleReg: r.vehicle_reg,
    serviceType: r.service_type,
    slot: r.slot,
    dealershipId: r.dealership_id,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export function requirePool(pool: pg.Pool | null): pg.Pool {
  if (!pool) throw new Error("database_not_configured");
  return pool;
}
