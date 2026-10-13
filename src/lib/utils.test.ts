import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("treats type-reading as a font size, so the last size wins", () => {
    expect(cn("text-xs", "type-reading")).toBe("type-reading");
    expect(cn("type-reading", "text-sm")).toBe("text-sm");
  });

  it("keeps a colour next to type-reading", () => {
    expect(cn("type-reading", "text-muted-foreground")).toBe("type-reading text-muted-foreground");
  });
});
