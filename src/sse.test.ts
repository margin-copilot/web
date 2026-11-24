import { streamOf } from "./fixtures";
import { readEvents } from "./sse";

async function all(body: ReadableStream<Uint8Array>) {
  const found = [];
  for await (const event of readEvents(body)) found.push(event);
  return found;
}

test("test_an_event_split_across_chunks_is_read_once", async () => {
  expect(await all(streamOf("event: st", 'ep\ndata: {"step":', '"route"}\n', "\n"))).toEqual([
    { event: "step", data: '{"step":"route"}' },
  ]);
});

test("test_two_events_in_one_chunk_are_both_read", async () => {
  expect(await all(streamOf('event: step\ndata: {"step":"route"}\n\nevent: done\ndata: {}\n\n'))).toEqual([
    { event: "step", data: '{"step":"route"}' },
    { event: "done", data: "{}" },
  ]);
});

test("test_crlf_line_endings_are_read", async () => {
  expect(await all(streamOf("event: step\r", '\ndata: {"step":"route"}\r\n\r\n'))).toEqual([
    { event: "step", data: '{"step":"route"}' },
  ]);
});

test("test_comment_lines_are_ignored", async () => {
  expect(await all(streamOf(": ping - 2026-11-24 12:00:00\r\n\r\nevent: done\r\ndata: {}\r\n\r\n"))).toEqual([
    { event: "done", data: "{}" },
  ]);
});

test("test_a_stream_without_a_final_blank_line_ends_without_the_partial_event", async () => {
  expect(await all(streamOf('event: step\ndata: {"step":"route"}\n\nevent: done\ndata: {}\n'))).toEqual([
    { event: "step", data: '{"step":"route"}' },
  ]);
});
