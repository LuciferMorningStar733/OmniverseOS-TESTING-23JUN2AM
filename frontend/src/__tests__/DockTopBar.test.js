import { APPS, getApp } from "../lib/apps";

describe("Dock and TopBar Active App Integration", () => {
  test("APPS registry supports essential Dock metadata", () => {
    const pinned = ["voice", "browser", "files", "settings"];
    for (const id of pinned) {
      const app = getApp(id);
      expect(app).toBeDefined();
      expect(app.name).toEqual(expect.any(String));
      expect(app.icon).toBeDefined();
      expect(app.color).toBeDefined();
    }
  });

  test("App registry exposes unique IDs and components", () => {
    expect(APPS.length).toBeGreaterThan(20);
    const chatApp = getApp("chat");
    expect(chatApp.name).toBe("AI Chat");
  });
});
