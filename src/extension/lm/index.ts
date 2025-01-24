import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import {
    type Provider,
    experimental_createProviderRegistry as createProviderRegistry
} from "ai";
import { createOllama } from "ollama-ai-provider";
import { createVsCodeLm } from "./providers/vscode-lm.provider";
// import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export async function createModelProviderRegistry(): Promise<Provider> {
    return createProviderRegistry({
        // Custom
        "vscode-lm": await createVsCodeLm(),

        // First-party
        anthropic: createAnthropic({
            apiKey: "" // TODO: Get Anthropic key from secret store...
        }),

        openai: createOpenAI({
            apiKey: "" // TODO: Get OpenAI key from secret store...
        }),

        // TODO: Seems to be outdated as it does not match the typings?
        azure: createAzure({
            resourceName: "", // TODO: Get Azure resource name from secret store...
            apiKey: "" // TODO: Get Azure key from secret store...
        }) as Provider, // TODO: Typings do not match (outdated?), using a cast. This needs to be fixed in the future.

        "amazon-bedrock": createAmazonBedrock({
            region: "", // TODO: Get AWS region from secret store...
            accessKeyId: "", // TODO: Get AWS access key from secret store...
            secretAccessKey: "", // TODO: Get AWS secret key from secret store...
            sessionToken: "" // TODO: Get AWS session token from secret store...
        }) as Provider, // TODO: Typings do not match (outdated?), using a cast. This needs to be fixed in the future.

        google: createGoogleGenerativeAI({
            apiKey: "" // TODO: Get Google key from secret store...
        }) as Provider, // TODO: Typings do not match (outdated?), using a cast. This needs to be fixed in the future.

        vertex: createVertex({
            location: "", // TODO: Get Google Vertex location from secret store...
            project: "", // TODO: Get Google Vertex project from secret store...
            googleAuthOptions: {
                apiKey: "" // TODO: Get Google Vertex key from secret store...
            }
        }) as Provider, // TODO: Typings do not match (outdated?), using a cast. This needs to be fixed in the future.

        mistral: createMistral({
            apiKey: "" // TODO: Get Mistral key from secret store...
        }) as Provider, // TODO: Typings do not match (outdated?), using a cast. This needs to be fixed in the future.

        xai: createXai({
            apiKey: "" // TODO: Get XAI key from secret store...
        }) as Provider, // TODO: Typings do not match (outdated?), using a cast. This needs to be fixed in the future.

        deepseek: createDeepSeek({
            apiKey: "" // TODO: Get DeepSeek key from secret store...
        }) as Provider, // TODO: Typings do not match (outdated?), using a cast. This needs to be fixed in the future.

        // Third-party
        ollama: createOllama({
            // biome-ignore lint/style/useNamingConvention: External types...
            baseURL: "" // TODO: Get Ollama base URL from secret store...
        })

        // TODO: The 'official' OpenRouter provider seems to be outdated. Casting does not work because there is too little overlap.
        // openrouter: createOpenRouter({
        //     apiKey: "", // TODO: Get OpenRouter key from secret store...
        //     compatibility: "strict",
        //     headers: {
        //         "HTTP-Referer": "https://recline.julesmons.nl/",
        //         "X-Title": "Recline"
        //     }
        // })
    });
}
