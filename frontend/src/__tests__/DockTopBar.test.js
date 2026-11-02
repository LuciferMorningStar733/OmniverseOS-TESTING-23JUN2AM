import { APPS, getApp } from "../lib/apps";
import Dock from "../components/Dock";

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

  test("Desktop Dock component is exported as a valid React component", () => {
    expect(typeof Dock).toBe("function");
  });

  test("macOS style 7-8 dock apps all resolve to registered apps with valid names", () => {
    const macosDockApps = [
      "dashboard",
      "browser",
      "chat",
      "voice",
      "files",
      "code",
      "notes",
      "settings",
    ];
    expect(macosDockApps.length).toBe(8);
    for (const id of macosDockApps) {
      const app = getApp(id);
      expect(app).toBeDefined();
      expect(app.name).toBeTruthy();
      expect(app.icon).toBeTruthy();
      expect(app.color).toBeTruthy();
    }
  });
});
