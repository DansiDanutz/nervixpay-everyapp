import { createServerFn } from "@tanstack/react-start";
import { gatewayUrl } from "@every-app/sdk/server";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { env } from "cloudflare:workers";
export const getHome = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => ({
    email: context.user.email,
    launcher: gatewayUrl(env),
  }));
