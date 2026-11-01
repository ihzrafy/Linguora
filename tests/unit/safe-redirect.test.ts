import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/utils";

describe("safeRedirectPath", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeRedirectPath("/app/notes?x=1#top")).toBe("/app/notes?x=1#top");
  });
  it.each(["//evil.example", "/\\evil.example", "/\\/evil.example", "https://evil.example", "javascript:alert(1)", "evil", "/%0d%0a", "/\tevil", null, 42])(
    "rejects %s",
    (next) => {
      const out = safeRedirectPath(next);
      expect(out.startsWith("/")).toBe(true);
      expect(new URL(out, "https://site.test").origin).toBe("https://site.test");
      if (typeof next === "string" && !next.startsWith("/%")) expect(out).toBe("/app/dashboard");
    },
  );
});
