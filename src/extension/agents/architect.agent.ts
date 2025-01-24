import { generateBasePrompt } from "@extension/prompts/base.prompt";
import { Agent } from "./agent";
import { LanguageModel } from "ai";

/**
 * Agent responsible for high-level software architecture decisions and design patterns.
 * Extends the base Agent class to provide specialized architectural guidance.
 *
 * @class
 * @extends {Agent}
 * @description The ArchitectAgent analyzes system requirements and proposes
 * architectural solutions, ensuring scalability, maintainability, and adherence
 * to design principles.
 */
export class ArchitectAgent extends Agent {

    constructor(model: LanguageModel, prompts: string[]) {
        super(
            model,
            prompts,
            generateBasePrompt(`
As a software architect, you are responsible for designing and overseeing the implementation of complex software systems.
You must ensure that the system meets the functional and non-functional requirements, such as performance, scalability, and maintainability.
You will be working closely with the development team to guide the implementation and ensure that the system architecture is sound.
`)
        )
    }
}
