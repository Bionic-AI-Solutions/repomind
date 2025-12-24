import OpenAI from "openai";
import type {
  AIProvider,
  GenerateOptions,
  FunctionDeclaration,
  FunctionCallResult,
} from "./interface";

/**
 * OpenAI Provider Implementation
 * Supports OpenAI API and OpenAI-compatible APIs (Ollama, LM Studio, etc.)
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(
    apiKey: string,
    baseURL?: string,
    defaultModel: string = "gpt-4"
  ) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined, // Use default OpenAI API if not provided
    });
    this.defaultModel = defaultModel;
  }

  async generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const modelName = options?.model || this.defaultModel;

    const response = await this.client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      tools: this.buildTools(options?.tools),
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("No response from OpenAI");
    }

    // Handle tool calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      // For non-function-calling use cases, return the content if available
      return message.content || "";
    }

    return message.content || "";
  }

  async *generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const modelName = options?.model || this.defaultModel;

    const stream = await this.client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      tools: this.buildTools(options?.tools),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async generateWithFunctions(
    prompt: string,
    functions: FunctionDeclaration[],
    options?: GenerateOptions
  ): Promise<FunctionCallResult> {
    const modelName = options?.model || this.defaultModel;

    const tools = functions.map((fn) => ({
      type: "function" as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      tools,
      tool_choice: "auto",
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("No response from OpenAI");
    }

    const functionCalls =
      message.tool_calls?.map((call) => ({
        name: call.function.name,
        args: JSON.parse(call.function.arguments || "{}"),
      })) || [];

    return {
      functionCalls,
      text: message.content || undefined,
    };
  }

  /**
   * Build OpenAI tools format from common Tool format
   */
  private buildTools(tools?: any[]): any[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return tools
      .filter((tool) => tool.type === "function" && tool.function)
      .map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      }));
  }
}

