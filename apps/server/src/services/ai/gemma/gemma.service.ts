import {
    GoogleGenAI
} from "@google/genai";
import { analyserOptions, streamOptions } from "./gemma.options";
import type { GenerateOptions } from "./gemma";


export class GemmaClient {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({
            apiKey,
        });
    }

    async generate(data: GenerateOptions) {
        return this.ai.interactions.create({
            ...analyserOptions,
            ...data,
            stream: false,
        })
    }

    async stream(data: GenerateOptions) {
        return this.ai.interactions.create({
            ...streamOptions,
            ...data,
            stream: true,
        })
    }
}