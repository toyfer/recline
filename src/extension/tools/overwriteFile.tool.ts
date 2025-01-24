import { tool } from "ai";
import * as vscode from "vscode";
import { z } from "zod";

export const overwriteFileTool = tool({
    description:
        "Either creates or fully overwrites the contents of a file within the workspace.",
    parameters: z.object({
        path: z
            .string()
            .trim()
            .nonempty()
            .describe("The path to the file to create/overwrite."),
        content: z.string().trim().describe("The content to write to the file.")
    }),
    execute: async ({ path, content }): Promise<string> => {
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(path),
            Uint8Array.from(Buffer.from(content))
        );

        return "The file has been created/overwritten successfully. Please proceed.";
    }
});
