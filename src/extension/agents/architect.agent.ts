import { generateBasePrompt } from "@extension/prompts/base.prompt";
import type { CoreMessage, LanguageModel } from "ai";
import { Agent } from "./agent";

/**
 * Agent responsible for high-level software architecture decisions and design patterns.
 * Extends the base Agent class to provide specialized architectural guidance.
 *
 * @class
 * @extends {Agent}
 * @description The ArchitectAgent analyzes system requirements and proposes
 * architectural solutions, ensuring scalability, maintainability, and adherence
 * to design principles. It can be consulted by {DeveloperAgent}s for guidance. It can also dispatch {DeveloperAgent}s to implement specific tasks.
 */
export class ArchitectAgent extends Agent {
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
As a software architect, you are responsible for designing and overseeing the implementation of complex software systems.
You must ensure that the system meets the functional and non-functional requirements, such as performance, scalability, and maintainability.
You will be working closely with the development team, guiding them and the implementation to ensure that the system architecture is sound.
`,
                systemPrompt
            ),
            messages
        );
    }
}
