import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  GenerateOptions,
  FunctionDeclaration,
  FunctionCallResult,
} from "./interface";

/**
 * Anthropic Claude Provider Implementation
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(
    apiKey: string,
    defaultModel: string = "claude-3-5-sonnet-20241022"
  ) {
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    this.client = new Anthropic({
      apiKey,
    });
    this.defaultModel = defaultModel;
  }

  async generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const modelName = options?.model || this.defaultModel;

    const message = await this.client.messages.create({
      model: modelName,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      top_p: options?.topP,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from content blocks
    const textContent = message.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    return textContent;
  }

  async *generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const modelName = options?.model || this.defaultModel;

    const stream = await this.client.messages.stream({
      model: modelName,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      top_p: options?.topP,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }

  async generateWithFunctions(
    prompt: string,
    functions: FunctionDeclaration[],
    options?: GenerateOptions
  ): Promise<FunctionCallResult> {
    const modelName = options?.model || this.defaultModel;

    // Convert to Anthropic's tool format
    const tools = functions.map((fn) => ({
      name: fn.name,
      description: fn.description,
      input_schema: {
        ...fn.parameters,
        type: "object" as const, // Anthropic requires explicit "object" type
      },
    }));

    const message = await this.client.messages.create({
      model: modelName,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      top_p: options?.topP,
      tools,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract tool use blocks
    const toolUseBlocks = message.content.filter(
      (block: any) => block.type === "tool_use"
    );

    const functionCalls = toolUseBlocks.map((block: any) => ({
      name: block.name,
      args: block.input || {},
    }));

    // Extract text content
    const textContent = message.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    return {
      functionCalls,
      text: textContent || undefined,
    };
  }
}

