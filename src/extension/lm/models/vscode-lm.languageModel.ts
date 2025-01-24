import { randomUUID } from "node:crypto";
import { ReadableStream } from "node:stream/web";

import type {
    FinishReason,
    LanguageModel,
    LanguageModelV1Prompt,
    LanguageModelV1StreamPart,
    ProviderMetadata
} from "ai";
import * as vscode from "vscode";

import { createContentBuilder } from "@extension/utils/contentBuilder.util";

import { roughlyEstimateTokenCount } from "../utils/roughlyEstimateTokenCount.util";
import { streamAsyncIterator } from "../utils/streamAsyncIterator.util";

function handleUnsupportedContent(
    type: string,
    mimeType: string,
    data: unknown
): vscode.LanguageModelChatMessage[] {
    const callId: string = randomUUID();
    return [
        vscode.LanguageModelChatMessage.Assistant([
            new vscode.LanguageModelToolCallPart(
                callId,
                `load_unsupported_${type}`,
                { as: mimeType }
            )
        ]),
        vscode.LanguageModelChatMessage.User([
            {
                callId,
                content: [data]
            } as vscode.LanguageModelToolResultPart
        ])
    ];
}

function convertPrompt(
    prompt: LanguageModelV1Prompt
): vscode.LanguageModelChatMessage[] {
    const messages: vscode.LanguageModelChatMessage[] = [];

    for (const message of prompt) {
        if (typeof message.content === "string") {
            messages.push(
                vscode.LanguageModelChatMessage.User(message.content)
            );
            return messages;
        }

        for (const part of message.content) {
            switch (part.type) {
                case "text": {
                    messages.push(
                        message.role === "assistant"
                            ? vscode.LanguageModelChatMessage.Assistant(
                                  part.text
                              )
                            : vscode.LanguageModelChatMessage.User(part.text)
                    );
                    break;
                }

                case "image": {
                    messages.push(
                        ...handleUnsupportedContent(
                            "image",
                            part.mimeType ?? "image/*",
                            part.image
                        )
                    );
                    break;
                }

                case "file": {
                    messages.push(
                        ...handleUnsupportedContent(
                            "file",
                            part.mimeType,
                            part.data
                        )
                    );
                    break;
                }

                case "tool-call": {
                    messages.push(
                        vscode.LanguageModelChatMessage.Assistant([
                            new vscode.LanguageModelToolCallPart(
                                part.toolCallId,
                                part.toolName,
                                part.args as object
                            )
                        ])
                    );
                    break;
                }

                case "tool-result": {
                    const parts: (
                        | vscode.LanguageModelTextPart
                        | vscode.LanguageModelPromptTsxPart
                        | unknown
                    )[] = [];

                    for (const content of part.content ?? []) {
                        switch (content.type) {
                            case "text":
                                parts.push(
                                    new vscode.LanguageModelTextPart(
                                        content.text
                                    )
                                );
                                break;

                            case "image":
                                parts.push(content.data);
                                break;
                        }
                    }

                    messages.push(
                        vscode.LanguageModelChatMessage.User([
                            new vscode.LanguageModelToolResultPart(
                                part.toolCallId,
                                parts
                            )
                        ])
                    );
                    break;
                }
            }
        }
    }

    return messages;
}

export async function vscodeLm(id: string): Promise<LanguageModel> {
    // Select the model that can handle the most tokens
    const model = (await vscode.lm.selectChatModels({ id })).sort(
        (a, b) => a.maxInputTokens - b.maxInputTokens
    )[0];

    if (!model) {
        throw new Error(`Model not found: ${id}`);
    }

    const countTokens = async (
        content: string | vscode.LanguageModelChatMessage[],
        cancellationToken: vscode.CancellationTokenSource
    ): Promise<number> => {
        const builder = createContentBuilder();

        if (typeof content === "string") {
            builder.append(content);
        } else {
            for (const message of content) {
                if (message.content instanceof vscode.LanguageModelTextPart) {
                    builder.append(message.content.value);
                } else if (
                    message.content instanceof
                    vscode.LanguageModelToolResultPart
                ) {
                    for (const part of message.content) {
                        if (part instanceof vscode.LanguageModelTextPart) {
                            builder.append(part.value);
                        }
                        if (
                            part instanceof vscode.LanguageModelPromptTsxPart &&
                            typeof part.value === "string"
                        ) {
                            builder.append(part.value);
                        }
                    }
                } else if (
                    message.content instanceof vscode.LanguageModelToolCallPart
                ) {
                    builder.append(
                        message.content.name +
                            JSON.stringify(message.content.input)
                    );
                }
            }
        }

        try {
            if (cancellationToken.token.isCancellationRequested) {
                const newToken = new vscode.CancellationTokenSource();
                const count = await model.countTokens(
                    builder.toString(),
                    newToken.token
                );
                newToken.dispose();
                return count;
            }
            return await model.countTokens(
                builder.toString(),
                cancellationToken.token
            );
        } catch (error) {
            return roughlyEstimateTokenCount(builder.toString());
        }
    };

    const vscodeLmModel: LanguageModel = {
        specificationVersion: "v1",
        defaultObjectGenerationMode: "tool",
        provider: model.vendor,
        modelId: model.id,
        supportsImageUrls: false,
        supportsStructuredOutputs: true,
        supportsUrl: (url): boolean => false,

        // The VSCode Language Model API only supports streaming, which is why the 'doGenerate' method is implemented as a wrapper around 'doStream'.
        // biome-ignore lint/nursery/useExplicitType: No exported type
        async doGenerate(options) {
            let finishReason: FinishReason = "unknown";

            let text = "";
            const toolCalls: Extract<
                LanguageModelV1StreamPart,
                { type: "tool-call" }
            >[] = [];

            const usage: { promptTokens: number; completionTokens: number } = {
                promptTokens: 0,
                completionTokens: 0
            };

            const { stream, rawCall } = await vscodeLmModel.doStream(options);

            try {
                for await (const part of streamAsyncIterator<LanguageModelV1StreamPart>(
                    // TODO: Should be fixed in the future...
                    //@ts-ignore: One of the vercel ai sdk packages seems to override the stream type.
                    stream
                )) {
                    switch (part.type) {
                        case "text-delta":
                            text += part.textDelta;
                            break;
                        case "tool-call":
                            toolCalls.push(part);
                            break;
                        case "finish":
                            finishReason = part.finishReason;
                            usage.promptTokens = part.usage.promptTokens;
                            usage.completionTokens =
                                part.usage.completionTokens;
                            break;
                        case "error":
                            throw part.error;
                    }
                }

                finishReason = "stop";
            } catch (error: unknown) {
                finishReason = "error";
            }

            return {
                text,
                toolCalls,
                finishReason,
                usage,
                rawCall
            };
        },

        // biome-ignore lint/nursery/useExplicitType: No exported type
        async doStream({
            prompt,
            abortSignal,
            inputFormat,
            mode,
            providerMetadata,
            responseFormat,
            headers,
            stopSequences,
            ...modelOptions
        }) {
            // 1. Setup Cancellation
            const cancellationToken = new vscode.CancellationTokenSource();

            if (abortSignal != null) {
                abortSignal.onabort = (): void => {
                    cancellationToken.cancel();
                };
            }

            // 2. Parse input
            const messages: vscode.LanguageModelChatMessage[] =
                convertPrompt(prompt);

            // 3. Start preemptively counting the tokens in parallel to the request to improve performance.
            const promptTokenPromise: Promise<number> = countTokens(
                messages,
                cancellationToken
            );

            // 4. Create request options
            const requestOptions = {
                justification: `Recline needs to use '${model.name}' from '${model.vendor}' in order to complete the task. Click 'Allow' to proceed.`,
                modelOptions // The VSCode Language Model API does not provide a schema for this, so the remaining 'safe' vercel options are passed directly and we hope for the best.
            };

            // 5. Create the stream consumer
            const consumeStream =
                async function* (): AsyncGenerator<LanguageModelV1StreamPart> {
                    // 5.1. Create content builder
                    const contentBuilder: string[] = [];

                    // 5.2. Setup finalization helper
                    const finish = async (
                        finishReason: FinishReason
                    ): Promise<{
                        type: "finish";
                        finishReason: FinishReason;
                        providerMetadata?: ProviderMetadata;
                        usage: {
                            promptTokens: number;
                            completionTokens: number;
                        };
                    }> => {
                        // Wait for the token counting to finish
                        const [promptTokens, completionTokens] =
                            await Promise.all([
                                promptTokenPromise,
                                countTokens(
                                    contentBuilder.join(""),
                                    cancellationToken
                                )
                            ]);

                        // Dispose the cancellation token
                        cancellationToken.dispose();

                        return {
                            type: "finish",
                            finishReason,
                            usage: {
                                promptTokens,
                                completionTokens
                            }
                        };
                    };

                    // 5.3. Send the request and consume the response stream
                    try {
                        const response = await model.sendRequest(
                            messages,
                            requestOptions,
                            cancellationToken.token
                        );

                        for await (const part of response.stream) {
                            if (part instanceof vscode.LanguageModelTextPart) {
                                contentBuilder.push(part.value);
                                yield {
                                    type: "text-delta",
                                    textDelta: part.value
                                };
                            } else if (
                                part instanceof vscode.LanguageModelToolCallPart
                            ) {
                                const args = JSON.stringify(part.input);
                                contentBuilder.push(part.name, args);
                                yield {
                                    type: "tool-call",
                                    toolCallType: "function",
                                    toolCallId: part.callId,
                                    toolName: part.name,
                                    args
                                };
                            }
                        }

                        yield await finish("stop");
                    } catch (error: unknown) {
                        yield {
                            type: "error",
                            error
                        };

                        if (error instanceof vscode.LanguageModelError) {
                            // Github Copilot only supports technical/software-oriented prompts
                            if (error.message.includes("off_topic")) {
                                yield await finish("content-filter");
                                return;
                            }

                            // Output limit reached.
                            // TODO: Currently based on the Copilot specific error message, other models need to be researched...
                            if (error.message.includes("too long")) {
                                yield await finish("length");
                                return;
                            }
                        }

                        yield await finish("error");
                    }
                };

            // 6. Return in AI SDK format
            return {
                // TODO: Should be fixed in the future...
                //@ts-ignore: One of the vercel ai sdk packages seems to override the stream type.
                stream: ReadableStream.from(
                    consumeStream()
                ) as globalThis.ReadableStream<LanguageModelV1StreamPart>,
                rawCall: {
                    rawPrompt: messages,
                    rawSettings: requestOptions
                }
            };
        }
    };

    return vscodeLmModel;
}
