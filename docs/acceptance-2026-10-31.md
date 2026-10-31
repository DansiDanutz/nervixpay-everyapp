# Alpha acceptance evidence — 31 October 2026

- Twelve automated tests pass, including encryption/owner binding, per-member isolation, device approval, merchant matching, live-write confirmation, exact decimal amounts, remote revocation failure, stripped customer details, read-only tools, and a concurrent live/test connection replacement regression.
- TypeScript and EveryApp release Worker-policy/migration checks pass.
- Browser: local Gateway renders the connection screen, defaults to Test, and reveals the explicit authorization checkbox when Live is selected. Accessible labels verified. No horizontal overflow at 320, 375, 768, 1024 and 1440 pixels; primary button is over 44 pixels high.
- Chrome extensions inject attributes and trigger a development hydration warning; the warning identifies extension attributes rather than app markup. Timestamps use deterministic UTC formatting.
- Cloudflare deployment succeeded at `https://nervixpay-everyapp.apps.nervixpay.live`. The required app secret is configured. Anonymous requests reach Cloudflare Access (HTTP 302 to the Access login), checked against the publicly resolved address.
- The Mac/network resolver initially cached the new hostname as nonexistent. This prevented a signed-in production browser check at the time of this record; public Cloudflare DNS already resolved it.
- `https://nervixpay.live` returned HTTP 200 with Vercel security headers. Root MX records remain Namecheap eforward1–5; SPF remains `v=spf1 include:spf.efwd.registrar-servers.com ~all`.

Pending: merchant-approved test connection on the deployed app, test draft/read/revoke acceptance, installation from the published GitHub release, and EveryApp catalog review. No real payment was attempted. Email delivery was not retested; this task verifies preservation of the existing DNS records.

## Patch 0.1.1

Follow-up review identified stale live-form confirmation, stale merchant selection across tabs, and coupled list failures. Regression tests were added before the fixes. The patch consumes confirmation per submission, rejects writes from replaced connections, and preserves the successful list when the other request fails. Unavailable lists no longer claim to be empty.

## Patch 0.1.2

The production page became accessible, but enrollment exposed a runtime incompatibility: Cloudflare Workers rejects the standard `redirect: "error"` option before sending a request. The HTTP helper now uses `manual` and rejects non-success responses, including redirects, without forwarding credentials. A regression simulates the Workers restriction and verifies redirect rejection.
