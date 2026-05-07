import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockAuditHistory } from "../../../helpers/mock-tirai-api";

const exportAuditReport = vi.fn();
vi.mock("@tirai/api", () => ({
  exportAuditReport: (...args: unknown[]) => exportAuditReport(...args),
}));

import {
  downloadBlob,
  exportAuditAdapter,
} from "@/features/audit/adapters/export.adapter";

describe("exportAuditAdapter", () => {
  beforeEach(() => exportAuditReport.mockReset());

  it("returns PDF blob with correct mime", async () => {
    exportAuditReport.mockResolvedValue({
      ok: true,
      value: new Blob(["x"], { type: "application/pdf" }),
    });
    const out = await exportAuditAdapter(buildMockAuditHistory(), "pdf");
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value.type).toBe("application/pdf");
  });

  it("returns CSV blob with correct mime", async () => {
    exportAuditReport.mockResolvedValue({
      ok: true,
      value: new Blob(["a,b"], { type: "text/csv" }),
    });
    const out = await exportAuditAdapter(buildMockAuditHistory(), "csv");
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value.type).toBe("text/csv");
  });
});

describe("downloadBlob", () => {
  it("creates and revokes object URL + clicks anchor", () => {
    const createSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:x");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return {
          tagName: "A",
          set href(_v: string) {},
          set download(_v: string) {},
          click: clickSpy,
        } as unknown as HTMLAnchorElement;
      }
      return origCreateElement(tag) as HTMLElement;
    });
    const appendSpy = vi
      .spyOn(document.body, "appendChild")
      .mockReturnValue({} as Node);
    const removeSpy = vi
      .spyOn(document.body, "removeChild")
      .mockReturnValue({} as Node);

    downloadBlob(new Blob(["x"]), "test.csv");

    expect(createSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(revokeSpy).toHaveBeenCalledWith("blob:x");
        resolve();
      }, 5),
    );
  });
});
