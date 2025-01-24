import { generateBasePrompt } from "@extension/prompts/base.prompt";
import type { CoreMessage, LanguageModel } from "ai";
import { Agent } from "./agent";

/**
 * Agent responsible for handling software development-related tasks and operations.
 * Extends the base Agent class to provide specialized functionality for development workflows.
 *
 * @class
 * @extends {Agent}
 */
export class DeveloperAgent extends Agent {
    public constructor(
        model: LanguageModel,
        cwd?: string,
        systemPrompt?: string,
        messages?: CoreMessage[]
    ) {
        super(
            model,
            cwd,
            generateBasePrompt(
                `
As a software developer, you are responsible for writing, testing (if explicitly requested), and maintaining code that meets the requirements of the project.
You will be working closely with the software architect to implement the system design and ensure that the code is of high quality.
You must be familiar with the programming languages, tools, and frameworks used in the project, and be able to work in a team environment.
`,
                systemPrompt
            ),
            messages
        );
    }
}
