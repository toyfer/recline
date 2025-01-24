export type ContentBuilder = {
    content: string[];
    append(text: string): number; // returns the new length
    toString(): string;
};

export function createContentBuilder(): ContentBuilder {
    const _content: string[] = [];
    return {
        content: _content,
        append: (content: string): number => _content.push(content),
        toString: () => _content.join("")
    };
}
