import { createSSEParser, consumeSSE } from "../lib/api";

describe("SSE Stream Parser Unit Tests", () => {
  it("should parse single line data payload correctly", () => {
    const events = [];
    const parser = createSSEParser((payload) => events.push(payload));

    parser.push("data: Hello World\n\n");
    expect(events).toEqual(["Hello World"]);
  });

  it("should join consecutive multiline data fields with newlines", () => {
    const events = [];
    const parser = createSSEParser((payload) => events.push(payload));

    parser.push("data: Line 1\ndata: Line 2\ndata: Line 3\n\n");
    expect(events).toEqual(["Line 1\nLine 2\nLine 3"]);
  });

  it("should handle arbitrary network byte chunking across push calls", () => {
    const events = [];
    const parser = createSSEParser((payload) => events.push(payload));

    parser.push("da");
    parser.push("ta: chunk 1");
    parser.push("\n");
    parser.push("data: chunk 2\n\n");

    expect(events).toEqual(["chunk 1\nchunk 2"]);
  });

  it("should flush remaining data buffer when flush() is invoked", () => {
    const events = [];
    const parser = createSSEParser((payload) => events.push(payload));

    parser.push("data: partial buffer");
    expect(events.length).toBe(0);

    parser.flush();
    expect(events).toEqual(["partial buffer"]);
  });

  it("should stop consumeSSE iteration when onEvent returns false", async () => {
    const received = [];
    const chunks = [
      Buffer.from("data: Event 1\n\n"),
      Buffer.from("data: [DONE]\n\n"),
      Buffer.from("data: Event 3\n\n"),
    ];
    let idx = 0;

    const mockResponse = {
      body: {
        getReader: () => ({
          read: async () => {
            if (idx < chunks.length) {
              return { done: false, value: chunks[idx++] };
            }
            return { done: true, value: undefined };
          },
          releaseLock: () => {},
        }),
      },
    };

    await consumeSSE(mockResponse, (payload) => {
      if (payload === "[DONE]") return false;
      received.push(payload);
    });

    expect(received).toEqual(["Event 1"]);
  });
});
