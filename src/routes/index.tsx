import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getHome } from "@/serverFunctions/home";
import {
  getStatus,
  connect,
  finish,
  disconnect,
  getLinks,
  getPayments,
  createLink,
} from "@/serverFunctions/payments";
export const Route = createFileRoute("/")({
  loader: async () => {
    const [home, connection] = await Promise.all([getHome(), getStatus()]);
    let links: Awaited<ReturnType<typeof getLinks>> = [],
      payments: Awaited<ReturnType<typeof getPayments>> = [],
      linksError = "",
      paymentsError = "";
    if (connection?.state === "connected") {
      const [linkResult, paymentResult] = await Promise.allSettled([
        getLinks(),
        getPayments(),
      ]);
      if (linkResult.status === "fulfilled") links = linkResult.value;
      else
        linksError =
          linkResult.reason instanceof Error
            ? linkResult.reason.message
            : "Links unavailable. Try refreshing.";
      if (paymentResult.status === "fulfilled") payments = paymentResult.value;
      else
        paymentsError =
          paymentResult.reason instanceof Error
            ? paymentResult.reason.message
            : "Payment history unavailable. Try refreshing.";
    }
    return { home, connection, links, payments, linksError, paymentsError };
  },
  head: () => ({ meta: [{ title: "NervixPay · EveryApp" }] }),
  component: Home,
});
function Home() {
  const { home, connection, links, payments, linksError, paymentsError } =
    Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [mode, setMode] = useState<"test" | "live">("test");
  async function change(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <a className="back" href={home.launcher} aria-label="Back to EveryApp">
          ‹ EveryApp
        </a>
        <span className="eyebrow">PAYMENTS, CONNECTED</span>
        <h1>
          NervixPay<span className="badge">Alpha</span>
        </h1>
        <p>Create payment links. See what has arrived.</p>
        <small>{home.email}</small>
      </header>
      <div aria-live="polite">{busy && <p>Working…</p>}</div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section>
        <h2>Your connection</h2>
        {connection?.state === "connected" ? (
          <>
            <p>
              <strong className="badge">{connection.mode.toUpperCase()}</strong>{" "}
              Merchant <code>{connection.merchantId}</code>
            </p>
            <p>
              Access expires{" "}
              {new Date(connection.expiresAt)
                .toISOString()
                .replace("T", " ")
                .replace(".000Z", " UTC")}
              . Disconnect and approve again to renew.
            </p>
            <button disabled={busy} onClick={() => void change(disconnect)}>
              Disconnect and revoke access
            </button>
          </>
        ) : (
          <>
            <p>
              Find your merchant ID in{" "}
              <a
                href="https://nervixpay.live/integrations"
                target="_blank"
                rel="noreferrer"
              >
                NervixPay → Integrations
              </a>
              . Your connection is private to your EveryApp account.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                void change(() =>
                  connect({
                    data: {
                      merchantId: String(form.get("merchantId")),
                      mode,
                      liveConfirmed: form.get("liveConfirmed") === "on",
                    },
                  }),
                );
              }}
            >
              <label>
                Merchant ID
                <input
                  required
                  name="merchantId"
                  placeholder="Merchant UUID"
                  defaultValue={connection?.merchantId}
                />
              </label>
              <label>
                Connection mode
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "test" | "live")}
                >
                  <option value="test">Test — draft links only</option>
                  <option value="live">Live — real checkout links</option>
                </select>
              </label>
              {mode === "live" && (
                <label className="check">
                  <input type="checkbox" name="liveConfirmed" required />I
                  authorize creation of real checkout links. Customers can pay
                  them.
                </label>
              )}
              <button disabled={busy} type="submit">
                {connection ? "Get a new approval code" : "Connect NervixPay"}
              </button>
            </form>
            {connection?.state === "pending" && (
              <aside>
                <h3>Approve this code in NervixPay</h3>
                <p className="code">{connection.userCode}</p>
                <p>
                  Expires{" "}
                  {new Date(connection.expiresAt)
                    .toISOString()
                    .replace("T", " ")
                    .replace(".000Z", " UTC")}
                  . Check merchant, mode and permissions before approving.
                </p>
                <a
                  href="https://nervixpay.live/integrations"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open NervixPay Integrations ↗
                </a>
                <div className="actions">
                  <button disabled={busy} onClick={() => void change(finish)}>
                    I've approved — check connection
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void change(disconnect)}
                  >
                    Cancel
                  </button>
                </div>
              </aside>
            )}
          </>
        )}
      </section>
      {connection?.state === "connected" && (
        <>
          <section>
            <h2>
              Create a{" "}
              {connection.mode === "test" ? "test draft" : "payment link"}
            </h2>
            <p>
              {connection.mode === "test"
                ? "Test drafts cannot receive payments. They let you try the link workflow safely."
                : "This creates a checkout link. It does not send funds or sign a transaction."}
            </p>
            <form
              onInput={(e) => {
                if ((e.target as HTMLInputElement).name !== "liveConfirmed") {
                  const approval = e.currentTarget.elements.namedItem(
                    "liveConfirmed",
                  ) as HTMLInputElement | null;
                  if (approval) approval.checked = false;
                }
              }}
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const approval = e.currentTarget.elements.namedItem(
                  "liveConfirmed",
                ) as HTMLInputElement | null;
                if (approval) approval.checked = false;
                void change(() =>
                  createLink({
                    data: {
                      connectionRevision: connection.revision,
                      itemName: String(form.get("itemName")),
                      amount: String(form.get("amount")),
                      network: form.get("network") as
                        | "polygon"
                        | "ethereum"
                        | "bnb",
                      currencyToken: form.get("currencyToken") as
                        | "USDC"
                        | "USDT",
                      liveConfirmed: form.get("liveConfirmed") === "on",
                    },
                  }),
                );
              }}
            >
              <label>
                Item name
                <input
                  name="itemName"
                  required
                  maxLength={80}
                  placeholder="Consultation"
                />
              </label>
              <div className="grid">
                <label>
                  Amount
                  <input
                    name="amount"
                    required
                    inputMode="decimal"
                    maxLength={40}
                    placeholder="10.00"
                  />
                </label>
                <label>
                  Token
                  <select name="currencyToken">
                    <option>USDC</option>
                    <option>USDT</option>
                  </select>
                </label>
                <label>
                  Network
                  <select name="network">
                    <option value="polygon">Polygon</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="bnb">BNB Chain</option>
                  </select>
                </label>
              </div>
              {connection.mode === "live" && (
                <label className="check">
                  <input type="checkbox" name="liveConfirmed" required />
                  Create a live checkout link for this amount and network.
                </label>
              )}
              <button disabled={busy} type="submit">
                Create {connection.mode === "test" ? "test draft" : "live link"}
              </button>
            </form>
          </section>
          <section>
            <div className="actions">
              <h2>Your links</h2>
              <button
                disabled={busy}
                onClick={() => void change(() => router.invalidate())}
              >
                Refresh
              </button>
            </div>
            {linksError ? (
              <p role="alert" className="error">
                {linksError}
              </p>
            ) : (
              !links.length && <p>No links yet.</p>
            )}
            <ul>
              {links.map((link) => (
                <li key={link.id}>
                  <strong>{link.itemName}</strong>
                  <span>
                    {link.prices
                      .map(
                        (p) => `${p.amount} ${p.currencyToken} · ${p.network}`,
                      )
                      .join(" / ")}
                  </span>
                  {link.mode === "live" ? (
                    <a
                      href={`https://nervixpay.live/l/${link.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open checkout ↗
                    </a>
                  ) : (
                    <small>Test draft · not payable</small>
                  )}
                  <small>{link.active ? "Active" : "Inactive"}</small>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Recent payments</h2>
            <p>
              Latest 20 merchant records. Test connections can read real payment
              history. No customer contact details are displayed.
            </p>
            {paymentsError ? (
              <p role="alert" className="error">
                {paymentsError}
              </p>
            ) : (
              !payments.length && <p>No payments recorded.</p>
            )}
            <ul>
              {payments.map((payment) => (
                <li key={payment.id}>
                  <strong>{payment.itemName}</strong>
                  <span>
                    {payment.amount} {payment.currencyToken} · {payment.network}
                  </span>
                  <span>{payment.status}</span>
                  <small>
                    {new Date(payment.createdAt)
                      .toISOString()
                      .replace("T", " ")
                      .replace(".000Z", " UTC")}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <footer>
        Powered by your NervixPay merchant account. No custody, wallet signing
        or automatic transfers.
        <br />
        <a href="https://nervixpay.live/docs" target="_blank" rel="noreferrer">
          NervixPay documentation
        </a>
      </footer>
    </main>
  );
}
