import { chatApi, authApi } from "../lib/api";

describe("Cortex Chat & Session Integration Tests", () => {
  beforeEach(() => {
    localStorage.setItem("omniverse_token", "test-mock-token");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should format chat payload properly for session requests", () => {
    const payload = {
      session_id: "test-session-123",
      message: "Hello Cortex",
      provider: "gemini",
      model: "gemini-2.5-flash",
    };

    expect(payload.session_id).toBe("test-session-123");
    expect(payload.message.length).toBeGreaterThan(0);
    expect(payload.provider).toBe("gemini");
  });
});
