import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AIProvider,
  GenerateOptions,
  FunctionDeclaration,
  FunctionCallResult,
} from "./interface";

/**
 * Gemini AI Provider Implementation
 * Wraps Google's Generative AI SDK to match the common interface
 */
export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = "gemini-2.5-flash") {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModel = defaultModel;
  }

  async generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const modelName = options?.model || this.defaultModel;
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: this.buildTools(options?.tools),
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async *generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const modelName = options?.model || this.defaultModel;
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: this.buildTools(options?.tools),
    });

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  async generateWithFunctions(
    prompt: string,
    functions: FunctionDeclaration[],
    options?: GenerateOptions
  ): Promise<FunctionCallResult> {
    const modelName = options?.model || this.defaultModel;
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: [
        {
          functionDeclarations: functions as any,
        },
      ],
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    // Extract function calls from Gemini response
    const functionCalls = response.functionCalls?.() || [];

    const mappedCalls = functionCalls.map((call: any) => ({
      name: call.name,
      args: call.args || {},
    }));

    return {
      functionCalls: mappedCalls,
      text: response.text(),
    };
  }

  /**
   * Build tools array for Gemini from common Tool format
   */
  private buildTools(tools?: any[]): any[] {
    if (!tools || tools.length === 0) {
      // Default: include googleSearch if available
      return [{ googleSearch: {} } as any];
    }

    return tools.map((tool) => {
      if (tool.type === "googleSearch") {
        return { googleSearch: {} };
      }
      if (tool.type === "function" && tool.function) {
        return {
          functionDeclarations: [tool.function],
        };
      }
      return tool;
    });
  }
}

