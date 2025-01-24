import { tool } from "ai";
import * as vscode from "vscode";
import { z } from "zod";

export const readFileTool = tool({
    description: "Reads all contents of a file within the workspace.",
    parameters: z.object({
        path: z
            .string()
            .trim()
            .nonempty()
            .describe("The path to the file to read.")
    }),
    execute: async ({ path }): Promise<void> => {
        await vscode.workspace.fs.readFile(vscode.Uri.file(path));
    }
});
