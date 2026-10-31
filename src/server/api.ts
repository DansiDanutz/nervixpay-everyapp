import { z } from "zod";
export const ORIGIN = "https://nervixpay.live";
export const scopes = [
  "integrations:verify",
  "payment_links:write",
  "payments:read",
];
export const connectInput = z
  .object({
    merchantId: z.string().uuid(),
    mode: z.enum(["test", "live"]),
    liveConfirmed: z.boolean().default(false),
  })
  .strict()
  .refine(
    (x) => x.mode === "test" || x.liveConfirmed,
    "Confirm live access first.",
  );
export const linkInput = z
  .object({
    connectionRevision: z.string().regex(/^[0-9a-f]{64}$/),
    itemName: z.string().trim().min(1).max(80),
    network: z.enum(["polygon", "ethereum", "bnb"]),
    currencyToken: z.enum(["USDC", "USDT"]),
    amount: z
      .string()
      .max(40)
      .regex(/^(\d+(\.\d{1,18})?|\.\d{1,18})$/)
      .refine((v) => /[1-9]/.test(v), "Amount must be positive."),
    liveConfirmed: z.boolean().default(false),
  })
  .strict();
export const linkSchema = z.object({
  id: z.string().uuid(),
  itemName: z.string(),
  mode: z.enum(["test", "live"]),
  active: z.boolean(),
  prices: z.array(
    z.object({
      network: z.string(),
      currencyToken: z.string(),
      amount: z.union([z.string(), z.number()]),
    }),
  ),
});
export const paymentSchema = z.object({
  id: z.string().uuid(),
  itemName: z.string(),
  status: z.string(),
  amount: z.union([z.string(), z.number()]),
  currencyToken: z.string(),
  network: z.string(),
  createdAt: z.string(),
});
export class ApiError extends Error {
  constructor(public status: number) {
    super(
      status === 401 || status === 403
        ? "Connection expired or permission denied. Reconnect in NervixPay."
        : status === 429
          ? "NervixPay rate limit reached. Wait before trying again."
          : `NervixPay request failed (${status}). Check your connection and account.`,
    );
  }
}
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  token?: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(ORIGIN + path, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error(
      method === "POST"
        ? "Request interrupted. Check the existing links before retrying; the request may have succeeded."
        : "NervixPay is unavailable. Try again shortly.",
    );
  }
  if (!response.ok) throw new ApiError(response.status);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error(
      "Unexpected NervixPay response. Refresh or contact support.",
    );
  return parsed.data;
}
