import { type LanguageModel, streamText } from "ai";
import * as vscode from "vscode";

import { createContentBuilder } from "@extension/utils/contentBuilder.util";

import { generateBasePrompt } from "@extension/prompts/base.prompt";
import { createCompleteTaskTool } from "@extension/tools/completeTask.tool";
import { overwriteFileTool } from "@extension/tools/overwriteFile.tool";
import { readFileTool } from "@extension/tools/readFile.tool";

export class Agent {
    protected cancellationTokenSource?: vscode.CancellationTokenSource;

    public constructor(
        protected readonly model: LanguageModel,
        protected readonly prompts: string[],
        protected readonly systemPrompt: string = generateBasePrompt()
    ) {}

    private ensureFreshCancellationToken(): void {
        if (this.cancellationTokenSource != null) {
            this.cancellationTokenSource.cancel();
            this.cancellationTokenSource.dispose();
        }

        this.cancellationTokenSource = new vscode.CancellationTokenSource();
    }

    public abort(): void {
        this.cancellationTokenSource?.cancel();
    }

    public async *run(): AsyncGenerator<string, void, unknown> {
        this.ensureFreshCancellationToken();

        // TODO: Throttling!!!
        while (
            this.cancellationTokenSource != null &&
            !this.cancellationTokenSource.token.isCancellationRequested
        ) {
            const { textStream } = streamText({
                system: this.systemPrompt,
                model: this.model,
                prompt: this.prompts.join("\n"),
                toolChoice: "required",
                tools: {
                    readFile: readFileTool,
                    overwriteFile: overwriteFileTool,

                    completeTaskTool: createCompleteTaskTool(
                        this.cancellationTokenSource
                    )
                }
            });

            const contentBuilder = createContentBuilder();

            for await (const chunk of textStream) {
                if (
                    this.cancellationTokenSource == null ||
                    this.cancellationTokenSource.token.isCancellationRequested
                ) {
                    this.cancellationTokenSource?.dispose();
                    break;
                }

                contentBuilder.append(chunk);
                yield chunk;
            }

            this.prompts.push(contentBuilder.toString());
        }
    }
}
