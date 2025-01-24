import { tool } from "ai";
import { z } from "zod";

import { ArchitectAgent } from "@extension/agents/architect.agent";
import { modelRegistry } from "@extension/index";
import { generateConsultantPrompt } from "@extension/prompts/consultant.prompt";
import { drainAsyncIterable } from "@extension/utils/drainAsyncIterable.util";

export const consultArchitectTool = tool({
    description:
        "Consult the grand software architect. May be used to request guidance or clarification on a particular task or issue, or to seek approval for a particular course of action.",
    parameters: z.object({
        message: z
            .string()
            .trim()
            .nonempty()
            .describe("The message to send to the grand software architect.")
    }),
    execute: async ({ message }): Promise<string> => {
        if (modelRegistry == null) {
            return "The grand software architect is currently unavailable. Please try again later.";
        }

        const architect = new ArchitectAgent(
            modelRegistry.languageModel(
                // TODO: Get from config or possibly let the model itself decide from a list of 'contacts' (with descriptions adapted to specific llm provider strengths WITHOUT mentioning specific model architecture)??
                "vscode-lm:copilot:claude-3.5-sonnet"
            ),
            undefined,
            generateConsultantPrompt(),
            [
                {
                    role: "user",
                    content: `
The other Recline agent's message is as follows:
\`\`\`
${message}
\`\`\`
                `
                }
            ]
        );

        return await drainAsyncIterable(architect.run());
    }
});
