/**
 * Common interface for all AI providers
 * Allows swapping between Gemini, OpenAI, Anthropic, and OpenAI-compatible APIs
 */

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: Tool[];
}

export interface Tool {
  type: 'function' | 'googleSearch';
  function?: FunctionDeclaration;
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface FunctionCallResult {
  functionCalls: FunctionCall[];
  text?: string;
}

export interface StreamChunk {
  text: string;
  done: boolean;
}

export interface AIProvider {
  /**
   * Generate a single response from a prompt
   */
  generateContent(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * Generate a streaming response from a prompt
   */
  generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string>;

  /**
   * Generate content with function calling support
   */
  generateWithFunctions(
    prompt: string,
    functions: FunctionDeclaration[],
    options?: GenerateOptions
  ): Promise<FunctionCallResult>;
}

