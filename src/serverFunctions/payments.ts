import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { connectInput, linkInput } from "@/server/api";
import * as payments from "@/server/payments";
export const getStatus = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => payments.status(context.user.id));
export const connect = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => connectInput.parse(data))
  .handler(({ context, data }) => payments.connect(context.user.id, data));
export const finish = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => payments.finish(context.user.id));
export const disconnect = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => payments.disconnect(context.user.id));
export const getLinks = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => payments.listLinks(context.user.id));
export const getPayments = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => payments.listPayments(context.user.id));
export const createLink = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => linkInput.parse(data))
  .handler(({ context, data }) => payments.createLink(context.user.id, data));
