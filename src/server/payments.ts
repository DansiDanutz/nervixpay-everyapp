import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { db } from "@/db";
import { connections } from "@/db/schema";
import { seal, unseal } from "./crypto";
import {
  api,
  ApiError,
  connectInput,
  linkInput,
  linkSchema,
  paymentSchema,
  scopes,
} from "./api";
function secret() {
  if (!env.CONNECTION_ENCRYPTION_KEY)
    throw new Error("Ask the Gateway owner to configure the encryption key.");
  return env.CONNECTION_ENCRYPTION_KEY;
}
export async function connection(userId: string) {
  return (
    await db.select().from(connections).where(eq(connections.userId, userId))
  )[0];
}
export async function status(userId: string) {
  const row = await connection(userId);
  return row
    ? {
        merchantId: row.merchantId,
        mode: row.mode,
        state: row.state,
        userCode: row.userCode,
        expiresAt: row.expiresAt,
      }
    : null;
}
export async function connect(
  userId: string,
  input: z.infer<typeof connectInput>,
) {
  const data = connectInput.parse(input);
  const old = await connection(userId);
  if (old?.state === "connected")
    throw new Error("Disconnect the existing connection first.");
  const result = await api(
    "/api/agent/device/request",
    z.object({
      deviceCode: z.string(),
      userCode: z.string(),
      expiresAt: z.string(),
    }),
    undefined,
    {
      merchantId: data.merchantId,
      mode: data.mode,
      clientName: "NervixPay for EveryApp",
      scopes,
      renewable: false,
    },
  );
  const row = {
    userId,
    merchantId: data.merchantId,
    mode: data.mode,
    state: "pending" as const,
    userCode: result.userCode,
    expiresAt: result.expiresAt,
    ciphertext: await seal(result.deviceCode, secret(), userId),
  };
  await db
    .insert(connections)
    .values(row)
    .onConflictDoUpdate({ target: connections.userId, set: row });
  return status(userId);
}
async function credential(userId: string) {
  const row = await connection(userId);
  if (
    !row ||
    row.state !== "connected" ||
    Date.parse(row.expiresAt) <= Date.now()
  )
    throw new Error(
      "Connect NervixPay first, or renew the expired connection.",
    );
  return { row, token: await unseal(row.ciphertext, secret(), userId) };
}
export async function finish(userId: string) {
  const row = await connection(userId);
  if (!row || row.state !== "pending")
    throw new Error("Start a connection first.");
  if (Date.parse(row.expiresAt) <= Date.now())
    throw new Error("Approval code expired. Start again.");
  let result;
  try {
    result = await api(
      "/api/agent/device/token",
      z.object({
        accessToken: z.string(),
        expiresAt: z.string(),
        mode: z.enum(["test", "live"]),
        scopes: z.array(z.string()),
      }),
      undefined,
      { deviceCode: await unseal(row.ciphertext, secret(), userId) },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409)
      throw new Error(
        "Approval is still pending. Approve the code in NervixPay, then check again.",
      );
    throw error;
  }
  const verified = await api(
    "/api/v1/verify",
    z.object({ merchant: z.object({ id: z.string() }) }),
    result.accessToken,
  );
  if (
    verified.merchant.id !== row.merchantId ||
    result.mode !== row.mode ||
    !scopes.every((s) => result.scopes.includes(s))
  )
    throw new Error(
      "The approved connection did not match the request. Revoke it in NervixPay and reconnect.",
    );
  await db
    .update(connections)
    .set({
      ciphertext: await seal(result.accessToken, secret(), userId),
      expiresAt: result.expiresAt,
      userCode: null,
      state: "connected",
    })
    .where(eq(connections.userId, userId));
  return status(userId);
}
export async function disconnect(userId: string) {
  const row = await connection(userId);
  if (row?.state === "connected") {
    try {
      await api(
        "/api/v1/credential",
        z.object({ ok: z.boolean() }),
        await unseal(row.ciphertext, secret(), userId),
        undefined,
        "DELETE",
      );
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
  }
  await db.delete(connections).where(eq(connections.userId, userId));
}
export async function listLinks(userId: string) {
  const { token } = await credential(userId);
  return (
    await api(
      "/api/v1/payment-links",
      z.object({ items: z.array(linkSchema) }),
      token,
    )
  ).items;
}
export async function listPayments(userId: string) {
  const { token } = await credential(userId);
  return (
    await api(
      "/api/v1/payments?limit=20",
      z.object({ items: z.array(paymentSchema) }),
      token,
    )
  ).items;
}
export async function createLink(
  userId: string,
  input: z.infer<typeof linkInput>,
) {
  const data = linkInput.parse(input);
  const { token, row } = await credential(userId);
  if (row.mode === "live" && !data.liveConfirmed)
    throw new Error("Confirm creation of a real payment link.");
  return (
    await api(
      "/api/v1/payment-links",
      z.object({ paymentLink: linkSchema }),
      token,
      {
        linkType: "share",
        itemName: data.itemName,
        prices: [
          {
            network: data.network,
            currencyToken: data.currencyToken,
            amount: data.amount,
            pricingMode: "fixed",
          },
        ],
      },
    )
  ).paymentLink;
}
