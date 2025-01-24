import { randomUUID } from "node:crypto";
import { ReadableStream } from "node:stream/web";
import type {
    FinishReason,
    LanguageModel,
    LanguageModelV1StreamPart,
    ProviderMetadata
} from "ai";
import * as vscode from "vscode";
import { roughlyEstimateTokenCount } from "../utils/roughlyEstimateTokenCount.util";
import { streamAsyncIterator } from "../utils/streamAsyncIterator.util";

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
        // 1. Stringify the content
        const contentBuilder: string[] = [];

        if (typeof content === "string") {
            contentBuilder.push(content);
        } else {
            for (const message of content) {
                if (message.content instanceof vscode.LanguageModelTextPart) {
                    contentBuilder.push(message.content.value);
                } else if (
                    message.content instanceof
                    vscode.LanguageModelToolResultPart
                ) {
                    for (const part of message.content) {
                        if (part instanceof vscode.LanguageModelTextPart) {
                            contentBuilder.push(part.value);
                        }

                        if (
                            part instanceof vscode.LanguageModelPromptTsxPart &&
                            typeof part.value === "string"
                        ) {
                            contentBuilder.push(part.value);
                        }
                    }
                } else if (
                    message.content instanceof vscode.LanguageModelToolCallPart
                ) {
                    contentBuilder.push(
                        message.content.name,
                        JSON.stringify(message.content.input)
                    );
                }
            }
        }

        const text: string = contentBuilder.join("");

        // TODO: Determine whether the token-count cache can be applied in this provider structure. (Research lifecycle, etc...)

        // 2. Count the tokens
        try {
            // If the user has already cancelled the request, a new token must be created.
            // The token count is required for the sliding context window and should not be roughly estimated unless absolutely necessary.
            if (cancellationToken.token.isCancellationRequested) {
                const cancellationTokenSource =
                    new vscode.CancellationTokenSource();
                const tokenCount: number = await model.countTokens(
                    text,
                    cancellationTokenSource.token
                );
                cancellationTokenSource.dispose();

                return tokenCount;
            }

            return await model.countTokens(text, cancellationToken.token);
        } catch (error: unknown) {
            // Fallback to rough estimation to unequivocally ensure the stream can continue.
            return roughlyEstimateTokenCount(text);
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
            const messages: vscode.LanguageModelChatMessage[] = [];

            for (const promptMessage of prompt) {
                switch (promptMessage.role) {
                    case "system":
                        messages.push(
                            vscode.LanguageModelChatMessage.User(
                                promptMessage.content
                            )
                        );
                        break;

                    case "user":
                        for (const part of promptMessage.content) {
                            switch (part.type) {
                                case "text": {
                                    //part instanceof LanguageModelV1TextPart
                                    messages.push(
                                        vscode.LanguageModelChatMessage.User(
                                            part.text
                                        )
                                    );
                                    break;
                                }

                                // TODO: Validate if the LM API can indeed be tricked into supporting images (even though it officially does not) by wrapping them in a tool result :)
                                case "image": {
                                    //part instanceof LanguageModelV1ImagePart
                                    const callId: string = randomUUID();
                                    messages.push(
                                        vscode.LanguageModelChatMessage.Assistant(
                                            [
                                                new vscode.LanguageModelToolCallPart(
                                                    callId,
                                                    "load_unsupported_image",
                                                    { as: part.mimeType }
                                                )
                                            ]
                                        )
                                    );
                                    messages.push(
                                        vscode.LanguageModelChatMessage.User([
                                            {
                                                callId,
                                                content: [part.image]
                                            } as vscode.LanguageModelToolResultPart
                                        ])
                                    );
                                    break;
                                }

                                // TODO: Validate if the LM API can indeed be tricked into supporting binary files (even though it officially does not) by wrapping them in a tool result :)
                                case "file": {
                                    // part instanceof LanguageModelV1FilePart
                                    const callId: string = randomUUID();
                                    messages.push(
                                        vscode.LanguageModelChatMessage.Assistant(
                                            [
                                                new vscode.LanguageModelToolCallPart(
                                                    callId,
                                                    "load_unsupported_file",
                                                    { as: part.mimeType }
                                                )
                                            ]
                                        )
                                    );
                                    messages.push(
                                        vscode.LanguageModelChatMessage.User([
                                            {
                                                callId,
                                                content: [part.data]
                                            } as vscode.LanguageModelToolResultPart
                                        ])
                                    );
                                    break;
                                }
                            }
                        }
                        break;

                    case "assistant":
                        for (const part of promptMessage.content) {
                            switch (part.type) {
                                case "text": {
                                    //part instanceof LanguageModelV1TextPart
                                    messages.push(
                                        vscode.LanguageModelChatMessage.Assistant(
                                            part.text
                                        )
                                    );
                                    break;
                                }

                                case "tool-call": {
                                    //part instanceof LanguageModelV1ToolCallPart
                                    messages.push(
                                        vscode.LanguageModelChatMessage.Assistant(
                                            [
                                                new vscode.LanguageModelToolCallPart(
                                                    part.toolCallId,
                                                    part.toolName,
                                                    part.args as object
                                                )
                                            ]
                                        )
                                    );
                                    break;
                                }
                            }
                        }
                        break;
                }
            }

            // 3. Start counting the tokens in parallel to the request to improve performance.
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
