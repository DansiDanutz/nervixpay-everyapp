import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
const mocks = vi.hoisted(() => ({
  getHome: vi.fn(),
  getStatus: vi.fn(),
  getLinks: vi.fn(),
  getPayments: vi.fn(),
  createLink: vi.fn(),
  invalidate: vi.fn(),
  data: {} as any,
}));
vi.mock("@/serverFunctions/home", () => ({ getHome: mocks.getHome }));
vi.mock("@/serverFunctions/payments", () => ({
  ...mocks,
  connect: vi.fn(),
  finish: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({
    options,
    useLoaderData: () => mocks.data,
  }),
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => [initial, vi.fn()],
}));
const { Route } = await import("./index");
const route = Route as unknown as {
  options: { loader: () => Promise<any>; component: () => ReactElement };
};
function elements(node: any): any[] {
  if (!node || typeof node !== "object") return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getHome.mockResolvedValue({ email: "test@example.com", launcher: "/" });
  mocks.getStatus.mockResolvedValue({
    state: "connected",
    mode: "live",
    merchantId: "merchant",
    expiresAt: "2099-01-01T00:00:00Z",
  });
  mocks.getLinks.mockResolvedValue([
    {
      id: "link",
      itemName: "Available",
      mode: "live",
      active: true,
      prices: [],
    },
  ]);
  mocks.getPayments.mockResolvedValue([]);
  mocks.createLink.mockResolvedValue({});
  mocks.invalidate.mockResolvedValue(undefined);
  mocks.data = {
    home: { email: "test@example.com", launcher: "/" },
    connection: {
      state: "connected",
      mode: "live",
      merchantId: "merchant",
      expiresAt: "2099-01-01T00:00:00Z",
    },
    links: [],
    payments: [],
    loadError: "",
  };
});
it("preserves links when payment history fails and reports unavailability", async () => {
  mocks.getPayments.mockRejectedValue(new Error("History unavailable"));
  const data = await route.options.loader();
  expect(data.links).toHaveLength(1);
  expect(data.paymentsError).toBe("History unavailable");
});
it("preserves payments when link loading fails", async () => {
  mocks.getLinks.mockRejectedValue(new Error("Links unavailable"));
  mocks.getPayments.mockResolvedValue([{ id: "payment" }]);
  const data = await route.options.loader();
  expect(data.payments).toHaveLength(1);
  expect(data.linksError).toBe("Links unavailable");
});
it("invalidates live confirmation when details change but permits checking it", () => {
  const form = elements(route.options.component()).find(
    (e) => e.type === "form",
  );
  const approval = { checked: true };
  const currentTarget = { elements: { namedItem: () => approval } };
  expect(form.props.onInput).toBeTypeOf("function");
  form.props.onInput({ target: { name: "amount" }, currentTarget });
  expect(approval.checked).toBe(false);
  approval.checked = true;
  form.props.onInput({ target: { name: "liveConfirmed" }, currentTarget });
  expect(approval.checked).toBe(true);
});
it("consumes confirmation on submission while sending the captured approval", async () => {
  const form = elements(route.options.component()).find(
    (e) => e.type === "form",
  );
  const approval = { checked: true };
  const values = {
    itemName: "Test",
    amount: "1",
    network: "polygon",
    currencyToken: "USDC",
    liveConfirmed: "on",
  };
  vi.stubGlobal(
    "FormData",
    class {
      get(name: keyof typeof values) {
        return values[name];
      }
    },
  );
  try {
    form.props.onSubmit({
      preventDefault() {},
      currentTarget: { elements: { namedItem: () => approval } },
    });
    await Promise.resolve();
    expect(mocks.createLink).toHaveBeenCalledWith({
      data: expect.objectContaining({ liveConfirmed: true }),
    });
    expect(approval.checked).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
