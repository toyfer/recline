import * as vscode from "vscode";
import { ReclinePanel } from "./webview/recline.panel";

export function activate(context: vscode.ExtensionContext): void {
    console.log("Recline: Initializing...");

    context.subscriptions.push(
        vscode.commands.registerCommand("recline.show", () => {
            ReclinePanel.show(context.extensionUri);
        })
    );

    console.log("Recline: Initialized successfully");
}
