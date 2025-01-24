import { type CoreTool, tool } from "ai";
import type * as vscode from "vscode";
import { z } from "zod";

export function createCompleteTaskTool(
    finalizer: (result: string) => void
): CoreTool {
    return tool({
        description: "Complete the task and present the result to the user.",
        parameters: z.object({
            result: z
                .string()
                .trim()
                .nonempty()
                .describe("The result to present to the user.")
        }),
        execute: async ({ result }, options): Promise<string> => {
            finalizer(result);
            return "The task has been completed successfully.";
        }
    });
}
