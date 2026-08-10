import React from "react";
import { useAgentStream } from "../hooks/useAgentStream";

function TestComponent({ endpoint }) {
  const { output, streaming, error, startStream, stopStream } = useAgentStream(endpoint);
  return (
    <div>
      <span data-testid="output">{output}</span>
      <span data-testid="streaming">{streaming ? "true" : "false"}</span>
      <span data-testid="error">{error || "none"}</span>
      <button data-testid="start" onClick={() => startStream({ test: true })}>Start</button>
      <button data-testid="stop" onClick={stopStream}>Stop</button>
    </div>
  );
}

describe("useAgentStream Hook Component Tests", () => {
  it("should export hook function correctly", () => {
    expect(typeof useAgentStream).toBe("function");
  });

  it("should instantiate inside a React component shell", () => {
    expect(() => <TestComponent endpoint="/api/ai/adversary" />).not.toThrow();
  });
});
