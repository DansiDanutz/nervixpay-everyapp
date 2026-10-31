# NervixPay for EveryApp

An open-source companion for creating NervixPay payment links and reading payment status from your own EveryApp Gateway. **Alpha; not an official EveryApp catalog listing.**

Each Gateway member connects their own merchant account. Test mode is the default: links are non-payable drafts. Live mode requires explicit approval in NervixPay and confirmation when creating each link. The app never holds wallet keys, signs transactions, or transfers funds.

## Install

Requires an existing [EveryApp Gateway](https://everyapp.com/docs/setup), Node.js 22.18+, and a NervixPay merchant account with onboarding completed.

```sh
everyapp install https://github.com/DansiDanutz/nervixpay-everyapp --json
```

The app initially shows **Needs setup**. Generate and save a 32-byte base64 encryption key in your password manager, then supply it at the hidden prompt:

```sh
everyapp secret set CONNECTION_ENCRYPTION_KEY --app nervixpay-everyapp
```

Do not use a merchant API token as the encryption key. Do not paste keys into chat, GitHub, or issue reports. See [setup](docs/setup.md) for generation and connection steps.

## Included

- Per-member NervixPay device approval; no passwords or wallet secrets.
- Test drafts and live share links with fixed USDC/USDT prices on Polygon, Ethereum or BNB Chain (subject to NervixPay support).
- Latest 20 payment records, with customer contact fields removed.
- Read-only `list_payment_links` and `list_payments` tools for EveryApp AI clients.
- Disconnect revokes the scoped credential before deleting it locally.

Test mode isolates **writes**, not payment history: the payment list may include real merchant payments. Account fees, supported token/network pairs, verification holds and plan limits remain controlled by NervixPay.

## Development

```sh
pnpm install --frozen-lockfile
# Add CONNECTION_ENCRYPTION_KEY to a gitignored .dev.vars file.
everyapp dev
pnpm test
pnpm types:check
pnpm build
```

Use Node 22.18+ and the package manager version declared in package.json. SDK/CLI dependencies are pinned by pnpm-lock.yaml. No NervixPay backend, Vercel, DNS, or email changes are required.

## Documentation

- [Setup and troubleshooting](docs/setup.md)
- [Architecture and security](docs/security.md)
- [Release and acceptance checklist](docs/release.md)
- [Catalog proposal](docs/marketplace.md)

MIT licensed. This license covers this companion only; it does not relicense the NervixPay service or source code.
