import { consumeSSE, createSSEParser } from "../lib/api";
import { TextDecoder as NodeTextDecoder } from "util";

const OriginalTextDecoder = global.TextDecoder;
beforeAll(() => { global.TextDecoder = NodeTextDecoder; });
afterAll(() => { global.TextDecoder = OriginalTextDecoder; });

function streamResponse(chunks, status = 200) {
  let index = 0;
  return {
    status,
    body: {
      getReader: () => ({
        read: async () => (
          index < chunks.length
            ? { done: false, value: chunks[index++] }
            : { done: true, value: undefined }
        ),
        releaseLock: () => {},
      }),
    },
  };
}

describe("SSE parser", () => {
  test("reassembles events split across arbitrary network boundaries", () => {
    const events = [];
    const parser = createSSEParser((event) => events.push(event));

    parser.push("data: The sen");
    parser.push("tence is complete\n\ndata: second");
    parser.push(" event\n\n");

    expect(events).toEqual(["The sentence is complete", "second event"]);
  });

  test("supports CRLF, comments, fields without a space, and multiline data", () => {
    const events = [];
    const parser = createSSEParser((event) => events.push(event));

    parser.push(": keepalive\r\n");
    parser.push("event: text\r\n");
    parser.push("data:first line\r\n");
    parser.push("data: second line\r\n\r\n");
    parser.push("data: final");
    parser.flush();

    expect(events).toEqual(["first line\nsecond line", "final"]);
  });

  test("flushes a final event when the stream has no trailing blank line", () => {
    const events = [];
    const parser = createSSEParser((event) => events.push(event));

    parser.push("data: final chunk");
    parser.flush();

    expect(events).toEqual(["final chunk"]);
  });

  test("decodes split UTF-8 bytes and stops after [DONE]", async () => {
    const events = [];
    const encoded = Buffer.from("data: café\n\n");
    const response = streamResponse([
      encoded.slice(0, encoded.length - 4),
      encoded.slice(encoded.length - 4),
      Buffer.from("data: [DONE]\n\n"),
      Buffer.from("data: should not be delivered\n\n"),
    ]);

    await consumeSSE(response, (event) => {
      events.push(event);
      return event !== "[DONE]";
    });

    expect(events).toEqual(["café", "[DONE]"]);
  });
});