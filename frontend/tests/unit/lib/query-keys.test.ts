import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query-keys";

describe("queryKeys", () => {
  it("inspectTicket returns deterministic 3-element array", () => {
    const key = queryKeys.inspectTicket("abc");
    expect(key).toEqual(["claim", "inspect", "abc"]);
  });

  it("inspectTicket equality on same input", () => {
    expect(queryKeys.inspectTicket("x")).toEqual(queryKeys.inspectTicket("x"));
  });

  it("inspectTicket differs on different input", () => {
    expect(queryKeys.inspectTicket("a")).not.toEqual(
      queryKeys.inspectTicket("b"),
    );
  });

  it("auditHistory returns deterministic 2-element array", () => {
    expect(queryKeys.auditHistory("vk")).toEqual(["audit", "vk"]);
  });

  it("auditHistory namespacing prevents collision with inspectTicket", () => {
    const a = queryKeys.auditHistory("same");
    const b = queryKeys.inspectTicket("same");
    expect(a[0]).not.toBe(b[0]);
  });
});
