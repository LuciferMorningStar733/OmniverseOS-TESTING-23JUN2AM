import React from "react";
import CyberOrb from "../components/CyberOrb";
import NeuralMatrix from "../apps/NeuralMatrix";

describe("Futuristic CyberOrb & Neural Matrix Component Tests", () => {
  it("should export CyberOrb function component", () => {
    expect(typeof CyberOrb).toBe("function");
  });

  it("should export NeuralMatrix function component", () => {
    expect(typeof NeuralMatrix).toBe("function");
  });
});
