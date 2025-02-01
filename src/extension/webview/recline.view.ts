import { randomBytes } from "node:crypto";
import * as vscode from "vscode";

export abstract class ReclineView {

    public static readonly id: string = "recline";

    public static createWebviewPanel(): vscode.WebviewPanel {

        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        return vscode.window.createWebviewPanel(
            ReclineView.id,
            "Recline",
            column || vscode.ViewColumn.One
        );
    }

    public static resolve(extensionUri: vscode.Uri, webviewPanel: { webview: vscode.Webview } = ReclineView.createWebviewPanel()): void {

        webviewPanel.webview.options = {
            enableScripts: true
        };

        webviewPanel.webview.html = ReclineView.getHtml(
            webviewPanel.webview,
            extensionUri
        );
    }

    private static getHtml(
        webview: vscode.Webview,
        extensionUri: vscode.Uri
    ): string {
        const styleUri: vscode.Uri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, "dist", "webview.css")
        );

        const scriptUri: vscode.Uri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, "dist", "webview.js")
        );

        const nonce: string = randomBytes(32).toString("hex");

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource}; img-src ${webview.cspSource} https: 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
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
