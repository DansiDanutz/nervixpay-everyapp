import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { callTool, listTools } from "@every-app/sdk/testing";
import * as schema from "@/db/schema";
import { seal, unseal } from "./crypto";
import { api, connectInput, linkInput } from "./api";
import { z } from "zod";
const state = vi.hoisted(() => ({
  db: null as unknown,
  secret: btoa("x".repeat(32)),
}));
vi.mock("@/db", () => ({
  get db() {
    return state.db;
  },
}));
vi.mock("cloudflare:workers", () => ({
  env: { CONNECTION_ENCRYPTION_KEY: state.secret },
}));
const service = await import("./payments");
const { tools } = await import("@/tools");
const merchantId = "11111111-1111-4111-8111-111111111111";
const expiresAt = "2099-01-01T00:00:00Z";
const fetchMock = vi.fn();
function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}
async function connected(userId = "alice", mode: "test" | "live" = "test") {
  await (state.db as ReturnType<typeof drizzle>)
    .insert(schema.connections)
    .values({
      userId,
      merchantId,
      mode,
      state: "connected",
      expiresAt,
      ciphertext: await seal("private-token", state.secret, userId),
    });
}
beforeEach(async () => {
  const db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  state.db = db;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
it("encrypts credentials and binds ciphertext to the owner", async () => {
  const value = await seal("private-token", state.secret, "alice");
  expect(value).not.toContain("private-token");
  expect(await unseal(value, state.secret, "alice")).toBe("private-token");
  await expect(unseal(value, state.secret, "bob")).rejects.toThrow();
  await expect(unseal(value, btoa("y".repeat(32)), "alice")).rejects.toThrow();
});
it("scopes reads, cancellation and status to the SDK user", async () => {
  await connected();
  expect(await service.status("bob")).toBeNull();
  await expect(service.listLinks("bob")).rejects.toThrow("Connect");
  await service.disconnect("bob");
  expect(await service.status("alice")).toMatchObject({ state: "connected" });
  expect(JSON.stringify(await service.status("alice"))).not.toContain(
    "ciphertext",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it("completes device approval without exposing secrets", async () => {
  reply({ deviceCode: "private-device", userCode: "ABCD-1234", expiresAt });
  await service.connect("alice", {
    merchantId,
    mode: "test",
    liveConfirmed: false,
  });
  const pending = await service.status("alice");
  expect(pending).toMatchObject({ userCode: "ABCD-1234", state: "pending" });
  expect(JSON.stringify(pending)).not.toContain("private-device");
  reply({
    accessToken: "private-token",
    expiresAt,
    mode: "test",
    scopes: ["integrations:verify", "payment_links:write", "payments:read"],
  });
  reply({ merchant: { id: merchantId } });
  expect(await service.finish("alice")).toMatchObject({
    state: "connected",
    userCode: null,
  });
  expect(JSON.stringify(await service.status("alice"))).not.toContain(
    "private-token",
  );
});
it("requires explicit live authorization for connection and each write", async () => {
  expect(connectInput.safeParse({ merchantId, mode: "live" }).success).toBe(
    false,
  );
  await connected("alice", "live");
  await expect(
    service.createLink("alice", {
      connectionRevision: (await service.status("alice"))!.revision,
      itemName: "Service",
      network: "polygon",
      currencyToken: "USDC",
      amount: "10",
      liveConfirmed: false,
    }),
  ).rejects.toThrow("Confirm");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("validates decimal amounts without rounding money", () => {
  for (const amount of [
    "0",
    "0.000",
    "-1",
    "1e4",
    "NaN",
    "1.1234567890123456789",
  ])
    expect(
      linkInput.safeParse({
        connectionRevision: "a".repeat(64),
        itemName: "Item",
        network: "polygon",
        currencyToken: "USDC",
        amount,
      }).success,
    ).toBe(false);
  expect(
    linkInput.parse({
      connectionRevision: "a".repeat(64),
      itemName: "Item",
      network: "polygon",
      currencyToken: "USDC",
      amount: "0.000000000000000001",
    }).amount,
  ).toBe("0.000000000000000001");
});
it("retains the connection if remote revocation fails", async () => {
  await connected();
  reply({ error: "down" }, 503);
  await expect(service.disconnect("alice")).rejects.toThrow();
  expect(await service.status("alice")).not.toBeNull();
});
it("rejects a grant for a different merchant", async () => {
  reply({ deviceCode: "private-device", userCode: "ABCD", expiresAt });
  await service.connect("alice", {
    merchantId,
    mode: "test",
    liveConfirmed: false,
  });
  reply({
    accessToken: "wrong-token",
    expiresAt,
    mode: "test",
    scopes: ["integrations:verify", "payment_links:write", "payments:read"],
  });
  reply({ merchant: { id: "another-merchant" } });
  await expect(service.finish("alice")).rejects.toThrow("did not match");
  expect(await service.status("alice")).toMatchObject({ state: "pending" });
});
it("does not retry writes or expose upstream error bodies", async () => {
  reply({ secret: "sensitive-upstream" }, 500);
  await expect(
    api("/api/v1/payment-links", z.object({}), "private-token", {}),
  ).rejects.toThrow("(500)");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
});
it("provides only read tools and isolates tool callers", async () => {
  const result = await listTools(tools);
  expect(result.tools.map((t) => [t.name, t.risk])).toEqual([
    ["list_payment_links", "read"],
    ["list_payments", "read"],
  ]);
  await connected();
  await callTool(tools, "list_payment_links", {}, { user: { id: "bob" } });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("creates a draft using the scoped token and exact amount", async () => {
  await connected();
  const link = {
    id: merchantId,
    itemName: "Example",
    mode: "test",
    active: true,
    prices: [{ network: "polygon", currencyToken: "USDC", amount: "1.01" }],
  };
  reply({ paymentLink: link });
  expect(
    await service.createLink("alice", {
      connectionRevision: (await service.status("alice"))!.revision,
      itemName: "Example",
      network: "polygon",
      currencyToken: "USDC",
      amount: "1.01",
      liveConfirmed: false,
    }),
  ).toEqual(link);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).prices[0].amount).toBe(
    "1.01",
  );
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer private-token",
  );
});
it("strips customer contact details from payment responses", async () => {
  await connected();
  reply({
    items: [
      {
        id: merchantId,
        itemName: "Example",
        status: "paid",
        amount: "1",
        currencyToken: "USDC",
        network: "polygon",
        createdAt: expiresAt,
        customerEmail: "private@example.com",
        recipientWallet: "private-wallet",
      },
    ],
  });
  const result = JSON.stringify(await service.listPayments("alice"));
  expect(result).not.toContain("private@example.com");
  expect(result).not.toContain("private-wallet");
});
it("revokes a stale live approval instead of attaching it to a newer test connection", async () => {
  reply({ deviceCode: "old-device", userCode: "LIVE", expiresAt });
  await service.connect("alice", {
    merchantId,
    mode: "live",
    liveConfirmed: true,
  });
  reply({
    accessToken: "live-token",
    expiresAt,
    mode: "live",
    scopes: ["integrations:verify", "payment_links:write", "payments:read"],
  });
  fetchMock.mockImplementationOnce(async () => {
    await (state.db as ReturnType<typeof drizzle>)
      .update(schema.connections)
      .set({
        mode: "test",
        ciphertext: await seal("new-device", state.secret, "alice"),
        userCode: "NEW",
      });
    return new Response(JSON.stringify({ merchant: { id: merchantId } }));
  });
  reply({ ok: true });
  await expect(service.finish("alice")).rejects.toThrow(
    "unused credential was revoked",
  );
  expect(await service.status("alice")).toMatchObject({
    state: "pending",
    mode: "test",
    userCode: "NEW",
  });
  expect(fetchMock.mock.calls.at(-1)?.[1]).toMatchObject({
    method: "DELETE",
    headers: { Authorization: "Bearer live-token" },
  });
});
it("rejects a form approved before the merchant connection changed", async () => {
  await connected("alice", "live");
  const old = await service.status("alice");
  await (state.db as ReturnType<typeof drizzle>)
    .update(schema.connections)
    .set({
      merchantId: "22222222-2222-4222-8222-222222222222",
      ciphertext: await seal("new-merchant-token", state.secret, "alice"),
    });
  reply({
    paymentLink: {
      id: merchantId,
      itemName: "Old form",
      mode: "live",
      active: true,
      prices: [],
    },
  });
  await expect(
    service.createLink("alice", {
      itemName: "Old form",
      network: "polygon",
      currencyToken: "USDC",
      amount: "1",
      liveConfirmed: true,
      ...{ connectionRevision: old!.revision },
    }),
  ).rejects.toThrow("Connection changed");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("uses the Workers-supported redirect mode and refuses redirected credentials", async () => {
  fetchMock.mockImplementationOnce(async (_url, init) => {
    if (init.redirect === "error")
      throw new TypeError("Unsupported redirect mode");
    return new Response(JSON.stringify({ ok: true }));
  });
  await expect(
    api("/api/v1/verify", z.object({ ok: z.boolean() }), "private-token"),
  ).resolves.toEqual({ ok: true });
  reply({}, 302);
  await expect(
    api("/api/v1/verify", z.object({}), "private-token"),
  ).rejects.toThrow("(302)");
  expect(
    fetchMock.mock.calls.every((call) => call[1].redirect === "manual"),
  ).toBe(true);
});
