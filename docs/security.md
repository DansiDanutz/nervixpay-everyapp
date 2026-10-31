# Architecture and security

Browser → EveryApp Gateway → private companion Worker → `https://nervixpay.live/api/...`.
The Worker uses an app-owned D1 database. NervixPay remains the payment system of record.

## Identity and isolation

The SDK `everyApp()` verifies Gateway identity. Every server function uses `ensureUserMiddleware`; every database query uses `context.user.id`. Tools use the SDK-provided `user.id`. No client-supplied user ID is accepted. All routes are private; there are no public webhook or callback routes.

D1 stores one connection per user: merchant ID, mode, state, expiry, pending display code, encrypted device secret or bearer token. AES-256-GCM uses a random 96-bit IV and the user ID as authenticated additional data, preventing ciphertext from being swapped between members. The key is an app Worker secret. Gateway/Cloudflare administrators remain trusted: encryption does not protect against an administrator who controls both code and secret bindings.

Status responses omit ciphertext and device/bearer secrets. Payment response schemas strip customer emails, names, references, wallets and other unneeded fields. Payment history is not stored in D1. Network requests target a fixed HTTPS origin, reject redirects, time out after 15 seconds, and never retry writes automatically. Upstream error bodies are not returned to clients.

## Authorization

Requested scopes: `integrations:verify`, `payment_links:write` (includes link reads), `payments:read`. No webhook management, wallet signing, renewal or transfer permissions. The issued mode, scopes and merchant must match the requested connection. Device approval stays in NervixPay. Tokens expire and are nonrenewable.

Test mode creates non-payable drafts but can read real merchant payment records. Live connection and live link creation each require explicit confirmation. AI tools are read-only in this release. Existing NervixPay account verification, chain support, pricing validation, limits and fees remain authoritative.

Disconnect attempts remote self-revocation before local deletion. A 401 permits local removal because the credential no longer authenticates. Other revocation errors preserve the local connection for retry.

## Known boundaries

- The app is alpha, and EveryApp is early development. This is not a third-party security audit.
- A device exchange that succeeds remotely but fails before persistence may require revocation in NervixPay and reconnecting. No refresh-token storage or automatic recovery is implemented.
- Connection changes use compare-and-swap checks so stale tabs cannot overwrite newer credentials. A token whose approval loses a race is revoked; if that remote revocation fails, revoke it in NervixPay.
- Live writes have no provider idempotency key. On timeout, inspect existing links before retrying.
- No automatic key rotation. Back up the encryption key separately from D1 and revoke tokens before clearing unrecoverable rows.
- Operators should apply their own D1 retention/backup policy. Uninstall does not substitute for remote credential revocation.

## Review

Review changes against `.agents/skills/everyapp/security-review.md`: SDK-only identity, user-scoped queries, private routes, honest tool risk, no secret disclosure, fixed outbound destinations. Tests cover credential encryption/owner binding, user isolation, device approval, merchant matching, live guards, amount precision, revocation failure, upstream errors and read-only tools. Browser and deployment acceptance are tracked in [release.md](release.md).

Report vulnerabilities privately through the repository's Security advisories when enabled, or the maintainer's GitHub profile. Do not post credentials or customer data in public issues.
