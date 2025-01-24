import type { ReadableStream } from "node:stream/web";

export async function* streamAsyncIterator<T = any>(
    stream: ReadableStream<T>
): AsyncGenerator<T, void, unknown> {
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                return;
            }

            yield value;
        }
    } finally {
        reader.releaseLock();
    }
}
