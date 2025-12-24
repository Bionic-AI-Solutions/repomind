import OpenAI from "openai";
import type {
  AIProvider,
  GenerateOptions,
  FunctionDeclaration,
  FunctionCallResult,
} from "./interface";

/**
 * Cluster AI Provider Implementation
 * Uses the Kubernetes cluster's AI infrastructure (mcp-api-server/ai-routing-api)
 * Supports both external access (via ingress) and internal access (via ClusterIP)
 */
export class ClusterAIProvider implements AIProvider {
  private client: OpenAI;
  private defaultModel: string;
  private baseURL: string;
  private healthCheckURL: string;

  constructor(
    baseURL?: string,
    defaultModel?: string,
    apiKey?: string
  ) {
    // Determine base URL - external ingress or internal service
    this.baseURL = baseURL || this.detectBaseURL();
    this.defaultModel =
      defaultModel || "/app/models/text_generation/qwen2.5-7b-instruct";
    this.healthCheckURL = `${this.baseURL.replace(/\/v1.*$/, "")}/health`;

    this.client = new OpenAI({
      apiKey: apiKey || "cluster-ai", // Placeholder, may not be required
      baseURL: this.baseURL,
    });
  }

  /**
   * Auto-detect the base URL based on environment
   * - If running in cluster: use ClusterIP service
   * - If external: use ingress URL
   */
  private detectBaseURL(): string {
    // Check if we have cluster service discovery
    const clusterService = process.env.CLUSTER_AI_SERVICE_URL;
    if (clusterService) {
      return clusterService;
    }

    // Check if we're in Kubernetes (KUBERNETES_SERVICE_HOST is set)
    const k8sServiceHost = process.env.KUBERNETES_SERVICE_HOST;
    if (k8sServiceHost) {
      // Running in cluster - use ClusterIP
      const serviceName = process.env.CLUSTER_AI_SERVICE || "mcp-api-server";
      const namespace = process.env.CLUSTER_AI_NAMESPACE || "ai-infrastructure";
      return `http://${serviceName}.${namespace}.svc.cluster.local:8000/mcp`;
    }

    // External access - use ingress
    const ingressURL =
      process.env.CLUSTER_AI_ENDPOINT || "https://api.askcollections.com";
    const path = process.env.CLUSTER_AI_PATH || "/mcp";
    return `${ingressURL}${path}`;
  }

  /**
   * Health check for cluster AI availability
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.healthCheckURL, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn("Cluster AI health check failed:", error);
      return false;
    }
  }

  async generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const modelName = options?.model || this.defaultModel;

    try {
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
        throw new Error("No response from cluster AI");
      }

      // Handle tool calls if present
      if (message.tool_calls && message.tool_calls.length > 0) {
        // For non-function-calling use cases, return the content if available
        return message.content || "";
      }

      return message.content || "";
    } catch (error: any) {
      // Enhanced error handling for cluster-specific issues
      if (error.status === 404) {
        throw new Error(
          `Cluster AI model not found: ${modelName}. Check available models.`
        );
      }
      if (error.status === 503 || error.code === "ECONNREFUSED") {
        throw new Error(
          "Cluster AI service unavailable. Check if the service is running."
        );
      }
      throw error;
    }
  }

  async *generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const modelName = options?.model || this.defaultModel;

    try {
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
    } catch (error: any) {
      // Enhanced error handling
      if (error.status === 404) {
        throw new Error(
          `Cluster AI model not found: ${modelName}. Check available models.`
        );
      }
      if (error.status === 503 || error.code === "ECONNREFUSED") {
        throw new Error(
          "Cluster AI service unavailable. Check if the service is running."
        );
      }
      throw error;
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

    try {
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
        throw new Error("No response from cluster AI");
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
    } catch (error: any) {
      // Enhanced error handling
      if (error.status === 404) {
        throw new Error(
          `Cluster AI model not found: ${modelName}. Check available models.`
        );
      }
      if (error.status === 503 || error.code === "ECONNREFUSED") {
        throw new Error(
          "Cluster AI service unavailable. Check if the service is running."
        );
      }
      throw error;
    }
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

  /**
   * Get available models from cluster AI
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const modelsURL = this.baseURL.replace(/\/v1\/.*$/, "/v1/models");
      const response = await fetch(modelsURL);
      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.warn("Failed to fetch available models:", error);
      return [this.defaultModel];
    }
  }
}

