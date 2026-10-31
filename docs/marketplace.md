# EveryApp catalog proposal

**Name:** NervixPay  
**Category:** Payments / Commerce  
**Repository:** https://github.com/DansiDanutz/nervixpay-everyapp  
**License:** MIT (companion only)  
**Status:** Alpha; catalog inclusion has not been approved.

**Summary:** Connect your NervixPay merchant account to EveryApp, create crypto payment links and view recent payment status. Start with non-payable test drafts, then explicitly enable live links. Each member's connection stays separate.

**Requirements:** EveryApp Gateway; a completed NervixPay merchant account; one app encryption secret. The merchant approves a scoped connection directly in NervixPay. No AI provider key, wallet private key, email changes or custody required. NervixPay service fees and account limits apply separately.

**Permissions:** App-owned D1 database, app encryption key, private Gateway identity. Direct outbound HTTPS to nervixpay.live. No public routes or Gateway email/member capabilities. Read-only AI tools.

**Install:** `everyapp install https://github.com/DansiDanutz/nervixpay-everyapp --json`

## Submission message

Hello EveryApp team,

We have built NervixPay for EveryApp, an MIT-licensed companion for scoped merchant connections, test-first crypto payment links, and read-only payment status. Source, installation instructions, security boundaries and a tenant-neutral release are available in the repository above.

We would like to submit it for your app catalog. Could you confirm the third-party submission process, review requirements, and whether this service-connected companion is eligible? The underlying NervixPay service remains separately hosted; this package does not claim to self-host the payment processor. We can supply screenshots and acceptance evidence as requested.

Please treat this as an alpha submission, not a claim of production-payment certification or EveryApp endorsement.

## Publication distinction

A GitHub release makes the app installable by URL. It does not automatically list it in EveryApp's catalog. Catalog admission is controlled by the EveryApp maintainers. Track their response and requirements before announcing a marketplace listing.
