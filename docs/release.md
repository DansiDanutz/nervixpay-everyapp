# Release and acceptance

## Build a release

Run tests, typecheck and the EveryApp security review before publishing. CI builds the tenant-neutral artifact for pull requests; release publishing is a deliberate separate step.

```sh
pnpm test
pnpm types:check
everyapp release --json
```

Attach `everyapp-release.tar.gz` to a GitHub release tagged with the package version. Consumers install from the repository URL. Only the companion source and tenant-neutral bundle are published; no Gateway credentials, local state, NervixPay private source or merchant data belongs in the release.

## Deploy this installation

```sh
everyapp deploy --gateway https://apps.nervixpay.live --json
```

Set the required encryption secret after the first deployment. Follow action-required messages. Never bypass Cloudflare Access or replace unrelated DNS records to resolve deployment problems.

## Acceptance checklist

- [ ] Tests, typecheck and release policy/migration validation pass on the exact release commit.
- [ ] Signed-in user sees the app; anonymous access is denied or redirected to authentication.
- [ ] Layout works on mobile and desktop, and controls have accessible labels.
- [ ] Merchant approves a test connection; the correct merchant/mode are displayed.
- [ ] A test draft appears in NervixPay and the companion without moving funds.
- [ ] Payment read works; a second member cannot read the first member's connection.
- [ ] Disconnect revokes access; expired/denied connections explain the recovery path.
- [ ] Website still responds and original root email DNS records remain intact.
- [ ] Install from the GitHub release succeeds on a Gateway.

Real-money acceptance is a separate, explicitly approved session. Record network, asset, amount cap, sender/recipient, expected fee, evidence and stop conditions before any payment. This companion deployment does not authorize a transfer.

## Rollback

Reinstall a previously verified release through EveryApp. Keep the same encryption key and back up D1 first. Do not reverse schema migrations or drop connection records without revoking affected credentials. Remove the companion from the Gateway only after revoking its credentials in NervixPay. The production website and email require no rollback because this app does not change them.
