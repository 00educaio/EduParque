import { describe, expect, it } from "vitest";
import { defaultSystemTheme, resolveTheme } from "./theme-values";

describe("resolveTheme", () => {
  it("aplica somente overrides validos sobre o tema base", () => {
    const result = resolveTheme(defaultSystemTheme, { primaryColor: "#112233", borderRadius: 4 });
    expect(result.primaryColor).toBe("#112233");
    expect(result.borderRadius).toBe(4);
    expect(result.surfaceColor).toBe(defaultSystemTheme.surfaceColor);
  });

  it("rejeita CSS arbitrario disfarçado de cor", () => expect(() => resolveTheme(defaultSystemTheme, { primaryColor: "red; display:none" })).toThrow());
});
