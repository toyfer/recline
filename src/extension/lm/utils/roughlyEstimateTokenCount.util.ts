export function roughlyEstimateTokenCount(text: string): number {
    return text.split(/\s+/).length;
}
