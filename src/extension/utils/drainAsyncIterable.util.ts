export async function drainAsyncIterable<T = unknown>(
    generator: AsyncGenerator<unknown, T, unknown>
): Promise<T> {
    let done: boolean = false;
    let value: T;
    do {
        const response = await generator.next();
        done = response.done ?? false;
        value = response.value as T;
        if (done) {
            value;
        }
    } while (!done);
    return value;
}
