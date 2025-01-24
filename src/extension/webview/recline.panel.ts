import { randomBytes } from "node:crypto";
import * as vscode from "vscode";

export abstract class ReclinePanel {
    public static readonly id: string = "recline";

    public static show(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const panel = vscode.window.createWebviewPanel(
            ReclinePanel.id,
            "Recline",
            column || vscode.ViewColumn.One
        );

        panel.webview.options = {
            enableScripts: true
        };

        panel.webview.html = ReclinePanel.getHtml(panel.webview, extensionUri);
    }

    private static getHtml(
        webview: vscode.Webview,
        extensionUri: vscode.Uri
    ): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, "dist", "webview.css")
        );

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, "dist", "webview.js")
        );

        const nonce = randomBytes(32).toString("hex");

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>Recline</title>

				<link href="${styleUri}" rel="stylesheet" />
			</head>
			<body>
                <div id="root" />
                <script nonce="${nonce}" src="${scriptUri}" />
			</body>
			</html>`;
    }
}
