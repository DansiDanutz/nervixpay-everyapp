# Contributor instructions

Read `.agents/skills/everyapp/SKILL.md` before CLI work and `.agents/skills/build-every-app/SKILL.md` before app changes.

- Keep EveryApp's Worker, router, database and build plumbing intact.
- Gateway identity comes only from the SDK: `ensureUserMiddleware` for server functions; tool handler `user` for tools. Never accept a client user ID.
- Shared behavior lives in `src/server/payments.ts`; server functions and tools call it. Every D1 query scopes by verified user ID.
- Validate inputs and upstream responses in `src/server/api.ts`. Keep the NervixPay origin fixed and redirects disabled. Never automatically retry writes.
- Credentials remain encrypted on the server using `src/server/crypto.ts`. Never return ciphertext, device secrets or bearer tokens to a browser/tool result or log.
- Test mode stays default; live connection and each live link require explicit confirmation. AI tools remain read-only unless separately designed and reviewed.
- Keep all routes private. No website/email DNS or NervixPay production changes are part of companion deployments.
- Schema changes go through `pnpm db:generate`; commit migrations. Never edit deployed migrations.
- Run `pnpm test`, `pnpm types:check`, and `everyapp release --json`; review the diff against `.agents/skills/everyapp/security-review.md`.
- Update README and docs when behavior changes. Publish only a verified tenant-neutral artifact; catalog inclusion needs maintainer acceptance.
