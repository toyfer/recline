import {
    type CoreMessage,
    type CoreTool,
    type LanguageModel,
    streamText
} from "ai";
import * as vscode from "vscode";

import { createContentBuilder } from "@extension/utils/contentBuilder.util";

import { generateBasePrompt } from "@extension/prompts/base.prompt";
import { createCompleteTaskTool } from "@extension/tools/completeTask.tool";
import { overwriteFileTool } from "@extension/tools/overwriteFile.tool";
import { readFileTool } from "@extension/tools/readFile.tool";
import { groupBy } from "es-toolkit";

export class Agent {
    protected cancellationTokenSource?: vscode.CancellationTokenSource;
    protected _completed: boolean = false;

    public constructor(
        protected readonly model: LanguageModel,
        protected readonly cwd?: string,
        protected readonly systemPrompt: string = generateBasePrompt(cwd),
        protected readonly messages: CoreMessage[] = [],
        protected readonly tools: Record<string, CoreTool> = {}
    ) {}

    public get busy(): boolean {
        return (
            this.cancellationTokenSource != null &&
            !this.cancellationTokenSource.token.isCancellationRequested &&
            !this._completed
        );
    }

    public get completed(): boolean {
        return this._completed;
    }

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

    public async *run(): AsyncGenerator<string, string, unknown> {
        console.log("Agent: Running...");

        this.ensureFreshCancellationToken();
        const currentRunContentBuilder = createContentBuilder();

        // TODO: Throttling!!!
        while (
            !this._completed &&
            this.cancellationTokenSource != null &&
            !this.cancellationTokenSource.token.isCancellationRequested
        ) {
            console.log("Agent: Iterating... (Re-prompt)");
            // Send prompts to the model
            const { textStream, toolCalls, toolResults, finishReason } =
                streamText({
                    system: this.systemPrompt,
                    model: this.model,
                    messages: this.messages,
                    toolChoice: "required",
                    tools: {
                        readFile: readFileTool,
                        overwriteFile: overwriteFileTool,
                        completeTaskTool: createCompleteTaskTool(
                            (result: string): void => {
                                this._completed = true;
                            }
                        ),
                        ...this.tools
                    }
                });

            // Create content builder
            const contentBuilder = createContentBuilder();

            // Consume stream
            for await (const chunk of textStream) {
                console.log("Agent: Yielding chunk...");
                if (
                    this._completed ||
                    this.cancellationTokenSource == null ||
                    this.cancellationTokenSource.token.isCancellationRequested
                ) {
                    break;
                }

                contentBuilder.append(chunk);
                yield chunk;
            }

            console.log("Agent: Stream ended.");

            // Append message to the current run content builder
            currentRunContentBuilder.append(contentBuilder.toString());

            // Update internal prompt history with generated text content
            this.messages.push({
                role: "assistant",
                content: contentBuilder.toString()
            });

            // Await tool interactions
            const [calls, results] = await Promise.all([
                toolCalls,
                toolResults
            ]);

            // Group tool calls and results by toolCallId because groups of two have to be appended to the messages array together and in order
            // This is because the tool call and result are related to each other and should be correctly ordered (to visualise the history of the conversation)

            const groupedCalls = groupBy(calls, (call) => call.toolCallId);
            const groupedResults = groupBy(
                results,
                (result) => result.toolCallId
            );

            // Append tool calls and results to messages array
            for (const toolCallId in groupedCalls) {
                const maxLength: number = Math.max(
                    groupedCalls[toolCallId].length,
                    groupedResults[toolCallId].length
                );

                for (let i = 0; i < maxLength; i++) {
                    const call = groupedCalls[toolCallId][i];
                    const result = groupedResults[toolCallId][i];

                    if (call != null) {
                        this.messages.push({
                            role: "assistant",
                            content: [
                                {
                                    type: "tool-call",
                                    toolCallId: call.toolCallId,
                                    toolName: call.toolName,
                                    args: call.args
                                }
                            ]
                        });
                    }

                    if (result != null) {
                        this.messages.push({
                            role: "tool",
                            content: [
                                {
                                    type: "tool-result",
                                    toolCallId: result.toolCallId,
                                    toolName: result.toolName,
                                    result: result.result
                                }
                            ]
                        });
                    }
                }
            }

            console.log("Agent: Finished iteration.");
        }

        // Cleanup
        this.cancellationTokenSource?.cancel(); // No jobs should be running at this point. This is just a safety measure.
        this.cancellationTokenSource?.dispose();
        this.cancellationTokenSource = undefined;

        console.log("Agent: Finished running.");

        return currentRunContentBuilder.toString("\n\n");
    }
}
