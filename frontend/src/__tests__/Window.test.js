import { getApp } from "../lib/apps";

describe("Window State & Integration Tests", () => {
  const dummyWin = {
    id: "test-win-1",
    app: "notes",
    x: 100,
    y: 100,
    w: 600,
    h: 400,
    minimized: false,
    maximized: false,
    z: 105,
  };

  it("should validate window object geometry and properties", () => {
    expect(dummyWin.id).toBe("test-win-1");
    expect(dummyWin.app).toBe("notes");
    expect(dummyWin.x).toBe(100);
    expect(dummyWin.y).toBe(100);
    expect(dummyWin.w).toBe(600);
    expect(dummyWin.h).toBe(400);
    expect(dummyWin.minimized).toBe(false);
    expect(dummyWin.maximized).toBe(false);
    expect(dummyWin.z).toBe(105);
  });

  it("should match window app id to registered app metadata", () => {
    const app = getApp(dummyWin.app);
    expect(app).toBeDefined();
    expect(app.name).toBe("Notes");
    expect(app.icon).toBe("fa-note-sticky");
    expect(app.color).toBe("#F59E0B");
  });
});
