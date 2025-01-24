export type ContentBuilder = {
    content: string[];
    append(text: string): number; // returns the new length
    clear(): void;
    toString(seperator?: string): string;
};

export function createContentBuilder(): ContentBuilder {
    const _content: string[] = [];
    let _cache: string | undefined = undefined;
    return {
        content: _content,
        append: (content: string): number => {
            const index = _content.push(content);
            _cache = undefined;
            return index;
        },
        clear: (): void => {
            _content.length = 0;
            _cache = undefined;
        },
        toString: (seperator: string = ""): string => {
            if (_cache == null) {
                _cache = _content.join(seperator);
            }
            return _cache;
        }
    };
}
