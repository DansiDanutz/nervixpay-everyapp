# Setup

## Gateway owner

1. Install the published GitHub release with the README command. No source build is needed for installation.
2. Generate a random encryption key: `openssl rand -base64 32`. Save the output in your password manager. It is sensitive; do not share it or include it in terminal screenshots.
3. Run `everyapp secret set CONNECTION_ENCRYPTION_KEY --app nervixpay-everyapp` and paste it at the hidden prompt. The app becomes available immediately.
4. Open NervixPay from your Gateway. All members may open the app, but connections are separated by the Gateway's verified user ID.

For development only, put the key in a gitignored `.dev.vars` as `CONNECTION_ENCRYPTION_KEY=...`. Never commit that file.

## Connect a merchant

1. Sign into [NervixPay Integrations](https://nervixpay.live/integrations) and find your merchant ID. Complete onboarding if required.
2. Enter the ID in the companion and leave **Test** selected.
3. Select **Connect NervixPay**. The app displays a short-lived approval code.
4. In NervixPay Integrations, approve that exact code after reviewing merchant, mode and scopes. Return and select **I've approved — check connection**. The device secret never leaves the server.
5. Create a test draft and refresh the list. A test draft has no payable checkout link.

Credentials are nonrenewable and normally expire after seven days. Disconnect and connect again when they expire. Switching mode requires disconnection and a new merchant approval. Live credentials cannot be silently upgraded from test.

## Live mode

Connect with **Live**, check the authorization box and approve the new code in NervixPay. Each new live link also requires a confirmation. Copy its checkout URL from **Open checkout**. Creating a link does not move funds; a customer payment is a separate wallet action outside this app.

## Troubleshooting

- **Needs setup:** the Gateway owner must configure the app encryption key.
- **Merchant unavailable:** check the merchant ID, completed onboarding and account status in NervixPay.
- **Approval pending:** approve the displayed code, then check again. Expired codes require a new request.
- **Connection expired/permission denied:** revoke the old credential in NervixPay Integrations if necessary and reconnect.
- **Request interrupted during creation:** check the existing links before retrying. Writes are not retried automatically; an interrupted response can still mean the link was created.
- **Disconnect fails:** the app keeps the credential so revocation can be retried. If it cannot be revoked here, revoke it in NervixPay Integrations. Do not assume removing a local record revokes remote access.
- **Interrupted approval after token exchange:** check/revoke the new credential in NervixPay and start again; a device token is delivered only once.
- **Encryption key lost or changed:** existing credentials cannot be decrypted. Restore the original key, or revoke affected credentials in NervixPay before an administrator clears the app's connection rows. Key rotation is not automatic.

The root website and existing email need no changes. Never enable email routing, replace root MX/SPF records, or change Vercel domains to install this app.
