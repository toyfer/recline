import { type LanguageModel, streamText } from "ai";

export class Agent {
    constructor(
        protected readonly model: LanguageModel,
        protected readonly systemPrompt: string,
        protected readonly prompts: string[]
    ) {}

    public async run(): Promise<void> {
        const { textStream } = streamText({
            system: this.systemPrompt,
            model: this.model,
            prompt: this.prompts.join("\n"),
            toolChoice: "required"
        });
    }
}
