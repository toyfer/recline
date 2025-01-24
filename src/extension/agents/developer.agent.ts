import { generateBasePrompt } from "@extension/prompts/base.prompt";
import { Agent } from "./agent";
import { LanguageModel } from "ai";

/**
 * Agent responsible for handling software development-related tasks and operations.
 * Extends the base Agent class to provide specialized functionality for development workflows.
 *
 * @class
 * @extends {Agent}
 */
export class DeveloperAgent extends Agent {

    constructor(model: LanguageModel, prompts: string[]) {
        super(
            model,
            prompts,
            generateBasePrompt(`
As a software developer, you are responsible for writing, testing, and maintaining code that meets the requirements of the project.
You will be working closely with the software architect to implement the system design and ensure that the code is of high quality.
You must be familiar with the programming languages, tools, and frameworks used in the project, and be able to work in a team environment.
`)
        )
    }
}
