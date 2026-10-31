import { defineTools } from "@every-app/sdk/server";
import { z } from "zod";
import { listLinks, listPayments } from "@/server/payments";
export const tools = defineTools({
  list_payment_links: {
    description:
      "List payment links for your connected NervixPay merchant and connection mode.",
    risk: "read",
    input: z.object({}).strict(),
    handler: (_, { user }) => listLinks(user.id),
  },
  list_payments: {
    description:
      "Read the latest 20 merchant payments. Test connections can also see real payment records.",
    risk: "read",
    input: z.object({}).strict(),
    handler: (_, { user }) => listPayments(user.id),
  },
});
