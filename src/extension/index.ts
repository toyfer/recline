import * as vscode from "vscode";
import { Agent } from "./agents/agent";
import { createModelProviderRegistry } from "./lm";
import { createContentBuilder } from "./utils/contentBuilder.util";
import { ReclinePanel } from "./webview/recline.panel";

export function activate(context: vscode.ExtensionContext): void {
    console.log("Recline: Initializing...");

    const modelRegistry = createModelProviderRegistry().then(
        (modelRegistry) => {
            context.subscriptions.push(
                vscode.commands.registerCommand("recline.show", () => {
                    ReclinePanel.show(context.extensionUri);
                })
            );

            context.subscriptions.push(
                vscode.commands.registerCommand(
                    "recline.testDrive",
                    async () => {
                        const agent = new Agent(
                            modelRegistry.languageModel(
                                "vscode-lm:copilot:claude-3.5-sonnet"
                            ),
                            [
                                "Please create 'hello_world.txt' in the root of my workspace. Insert your best knock-knock joke into the file."
                            ]
                        );

                        const builder = createContentBuilder();
                        for await (const chunk of agent.run()) {
                            builder.append(chunk);
                        }

                        console.log(builder.toString());
                    }
                )
            );

            console.log("Recline: Initialized successfully");
        }
    );
}
