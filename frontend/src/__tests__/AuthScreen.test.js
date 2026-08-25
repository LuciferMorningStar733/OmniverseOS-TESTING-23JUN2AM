import AuthScreen from "../components/AuthScreen";
import AuthBackground from "../components/Auth/AuthBackground";
import AuthCommandPalette from "../components/Auth/AuthCommandPalette";

describe("AuthScreen Flagship Redesign Integration", () => {
  test("exports AuthScreen component function", () => {
    expect(typeof AuthScreen).toBe("function");
  });

  test("exports AuthBackground component function", () => {
    expect(typeof AuthBackground).toBe("function");
  });

  test("exports AuthCommandPalette component function", () => {
    expect(typeof AuthCommandPalette).toBe("function");
  });
});
