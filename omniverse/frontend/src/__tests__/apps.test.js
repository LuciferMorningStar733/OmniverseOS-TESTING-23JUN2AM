/**
 * Smoke test: app registry must expose all 19 expected modules with
 * required metadata. Pure data — no DOM / axios / router needed.
 */
import { APPS, getApp } from "../lib/apps";

describe("apps registry", () => {
  test("exposes exactly 19 apps", () => {
    expect(APPS).toHaveLength(19);
  });

  test("every app has required fields", () => {
    for (const a of APPS) {
      expect(a.id).toEqual(expect.any(String));
      expect(a.name).toEqual(expect.any(String));
      expect(a.icon).toMatch(/^fa-/);
      expect(a.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(a.Component).toBeDefined();
      expect(a.group).toEqual(expect.any(String));
    }
  });

  test("app ids are unique", () => {
    const ids = APPS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("getApp returns the matching app or undefined", () => {
    expect(getApp("dashboard")?.name).toBe("Dashboard");
    expect(getApp("nonexistent")).toBeUndefined();
  });
});
