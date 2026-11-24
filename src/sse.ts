// Server-sent events from a fetch body (D-045). The browser's EventSource can't send the token in a
// header, so the chat reads the stream itself. Lines end in \r\n, \n or \r; a blank line ends an
// event; ":" lines are comments (the server's pings); an event cut off by the end is dropped.
export interface StreamEvent {
  event: string;
  data: string;
}

export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "message";
  let data: string[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
    for (;;) {
      const end = buffer.search(/\r\n|\n|\r/);
      // a \r at the end may be the first half of \r\n: wait for the next chunk
      if (end < 0 || (end === buffer.length - 1 && buffer[end] === "\r" && !done)) break;
      const line = buffer.slice(0, end);
      buffer = buffer.slice(buffer.startsWith("\r\n", end) ? end + 2 : end + 1);
      if (line === "") {
        if (data.length) yield { event, data: data.join("\n") };
        event = "message";
        data = [];
      } else if (!line.startsWith(":")) {
        const colon = line.indexOf(":");
        const field = colon < 0 ? line : line.slice(0, colon);
        const text = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = text;
        else if (field === "data") data.push(text);
      }
    }
    if (done) return;
  }
}
