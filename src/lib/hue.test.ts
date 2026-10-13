import { describe, expect, it } from "vitest";
import { HUES, hueFor } from "./hue";

describe("hueFor", () => {
  it("gives the same entity the same hue every time", () => {
    expect(hueFor("acme-app")).toBe(hueFor("acme-app"));
  });

  // Atlas Standards hashes the same way, so a project is the same hue on the
  // desktop, the web app and the phone. These pin the shared algorithm.
  it("matches the hash the web and mobile apps use", () => {
    expect(hueFor("")).toBe("grey");
    expect(hueFor("a")).toBe(HUES[97 % 8]);
    expect(hueFor("ab")).toBe(HUES[(97 * 31 + 98) % 8]);
  });

  it("spreads keys across all eight hues", () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => hueFor(`project-${i}`)));
    expect(seen.size).toBe(HUES.length);
  });
});
