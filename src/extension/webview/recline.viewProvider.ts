import type * as vscode from "vscode";

import { ReclineView } from "./recline.view";


export class ReclineViewProvider implements vscode.WebviewViewProvider {

    public static get viewId(): string {
        return ReclineView.id;
    }

    public constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
        ReclineView.resolve(this.extensionUri, webviewView);
    }
}
