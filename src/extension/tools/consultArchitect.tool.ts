import { tool } from "ai";
import { z } from "zod";

import { ArchitectAgent } from "@extension/agents/architect.agent";
import { modelRegistry } from "@extension/index";
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
            `
You are currently deployed in a non-workspace environment as a consultant. Another Recline agent has requested your assistance.
Unlike you, the other Recline agent calling upon you _is_ deployed in a workspace-environment, so you may instruct it as such.
You may also reference 'your current workspace' and the other Recline agent will know where on the filesystem this is.
The other Recline agent is most likely stuck, or in need of architectural/big-picture-level guidance.
Please provide your expert advice in order to help them progress their own respective task.

You will now be connected to the other Recline agent.
The other Recline agent can only provide one singular message and will not be able to respond to any further questions or prompts.
The output of your \`completeTask\` tool will be presented to the other Recline agent as a response, after which the connection will be terminated.
`,
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
