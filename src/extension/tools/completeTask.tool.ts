import { tool } from "ai";
import { z } from "zod";
import * as vscode from "vscode";

export function createCompleteTaskTool(cancellationTokenSource: vscode.CancellationTokenSource) {

    return tool({
        description:
            "Complete the task and present the result to the user.",
        parameters: z.object({
            result: z
                .string()
                .trim()
                .nonempty()
                .describe("The result to present to the user.")
        }),
        execute: async ({ result }, options): Promise<void> => {
            console.log(result);
            cancellationTokenSource.cancel();
        }
    });
}
