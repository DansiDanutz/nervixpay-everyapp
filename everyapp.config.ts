import { defineEveryApp } from "@every-app/sdk";
export default defineEveryApp({
  id: "nervixpay-everyapp",
  name: "NervixPay",
  description:
    "Create crypto payment links and check payments through your own NervixPay connection.",
  resources: { d1: ["DB"] },
  access: "everyone",
  secrets: [
    {
      name: "CONNECTION_ENCRYPTION_KEY",
      why: "Encrypts each member's NervixPay credential. Use 32 random bytes encoded as base64.",
    },
  ],
});
