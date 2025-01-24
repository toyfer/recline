import {
    type Provider,
    experimental_createProviderRegistry as createProviderRegistry,
    experimental_customProvider as customProvider
} from "ai";
import { groupBy } from "es-toolkit";
import * as vscode from "vscode";

import { vscodeLm } from "@extension/lm/models/vscode-lm.languageModel";

export async function createVSCodeLM(): Promise<Provider> {
    const providers = new Map<string, Provider>();
    const vendors = groupBy(
        await vscode.lm.selectChatModels(),
        (m) => m.vendor
    );

    for (const [vendor, models] of Object.entries(vendors)) {
        providers.set(
            vendor,
            customProvider({
                languageModels: Object.fromEntries(
                    await Promise.all(
                        models.map(async (m) => [
                            m.family,
                            await vscodeLm(m.family)
                        ])
                    )
                )
            })
        );
    }

    return createProviderRegistry(Object.fromEntries(providers));
}
