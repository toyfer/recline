import { type LanguageModel, streamText } from "ai";
import * as vscode from "vscode";

import { createContentBuilder } from "@extension/utils/contentBuilder.util";

import { readFileTool } from "@extension/tools/readFile.tool";
import { overwriteFileTool } from "@extension/tools/overwriteFile.tool";
import { createCompleteTaskTool } from "@extension/tools/completeTask.tool";
import { generateBasePrompt } from "@extension/prompts/base.prompt";


export class Agent {
    constructor(
        protected readonly model: LanguageModel,
        protected readonly prompts: string[],
        protected readonly systemPrompt: string = generateBasePrompt()
    ) {}

    public async* run(): AsyncGenerator<string, vscode.CancellationTokenSource, any> {

        const cancellationTokenSource = new vscode.CancellationTokenSource();

        // TODO: Throttling!!!
        while (!cancellationTokenSource.token.isCancellationRequested) {

            const { textStream } = streamText({
                system: this.systemPrompt,
                model: this.model,
                prompt: this.prompts.join("\n"),
                toolChoice: "required",
                tools: {
                    "readFile": readFileTool,
                    "overwriteFile": overwriteFileTool,
                    "completeTaskTool": createCompleteTaskTool(cancellationTokenSource)
                }
            });
    
            const contentBuilder = createContentBuilder();

            for await (const chunk of textStream) {

                if (cancellationTokenSource.token.isCancellationRequested) {
                    cancellationTokenSource.dispose();
                    break;
                }

                contentBuilder.append(chunk);
                yield chunk;
            }

            this.prompts.push(contentBuilder.toString());
        }

        return cancellationTokenSource;
    }
}
