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
    const rawBaseURL = baseURL || this.detectBaseURL();
    this.defaultModel =
      defaultModel || "/app/models/text_generation/qwen2.5-7b-instruct";
    
    // OpenAI SDK automatically appends /v1/chat/completions to baseURL
    // For internal cluster access, baseURL should be just the host:port
    // For external access, baseURL should include the path prefix (/mcp)
    // Remove trailing slashes to avoid double slashes
    let cleanBaseURL = rawBaseURL.replace(/\/$/, "");
    
    // For external access with /mcp path, the SDK will append /v1/chat/completions
    // So baseURL should be: https://api.askcollections.com/mcp
    // SDK will call: https://api.askcollections.com/mcp/v1/chat/completions
    
    // However, if the baseURL already ends with /v1, the SDK will still append /chat/completions
    // So we need to ensure the baseURL is exactly: https://api.askcollections.com/mcp
    // NOT: https://api.askcollections.com/mcp/v1 (this would cause double /v1)
    
    // For internal access, baseURL is just host:port
    // SDK will call: http://host:port/v1/chat/completions
    
    // Store the clean baseURL for client use
    this.baseURL = cleanBaseURL;
    this.healthCheckURL = `${cleanBaseURL.replace(/\/v1.*$/, "").replace(/\/mcp$/, "")}/health`;
    
    console.log(`[ClusterAI] Initializing with baseURL: ${cleanBaseURL}, model: ${this.defaultModel}`);
    
    this.client = new OpenAI({
      apiKey: apiKey || "cluster-ai", // Placeholder, may not be required
      baseURL: cleanBaseURL,
      timeout: 60000, // 60 second timeout
      maxRetries: 2,
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
      // Running in cluster - use ClusterIP service
      // Internal service doesn't use /mcp prefix, direct /v1/* endpoints
      // OpenAI SDK needs /v1 in baseURL, will append /chat/completions
      // So baseURL should be: http://host:port/v1
      // SDK will call: http://host:port/v1/chat/completions
      const serviceName = process.env.CLUSTER_AI_SERVICE || "mcp-api-server";
      const namespace = process.env.CLUSTER_AI_NAMESPACE || "ai-infrastructure";
      return `http://${serviceName}.${namespace}.svc.cluster.local:8000/v1`;
    }

    // External access - use ingress
    const ingressURL =
      process.env.CLUSTER_AI_ENDPOINT || "https://api.askcollections.com";
    const path = process.env.CLUSTER_AI_PATH || "/mcp";
    // OpenAI SDK needs /v1 in the baseURL for external access
    // SDK will append /chat/completions, so we need: https://api.askcollections.com/mcp/v1
    return `${ingressURL}${path}/v1`;
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
      console.log(`[ClusterAI] Making request to baseURL: ${this.baseURL}, model: ${modelName}`);
      // Note: OpenAI SDK appends /chat/completions to baseURL
      // For external: baseURL is https://api.askcollections.com/mcp/v1, SDK calls /chat/completions
      // For internal: baseURL is http://host:port, SDK calls /v1/chat/completions
      console.log(`[ClusterAI] Full endpoint will be: ${this.baseURL}/chat/completions`);
      
      // Add timeout wrapper to prevent hanging
      const timeoutMs = 60000; // 60 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Cluster AI request timed out after ${timeoutMs}ms`)), timeoutMs);
      });
      
      const apiPromise = this.client.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        tools: this.buildTools(options?.tools),
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);

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
      // OpenAI SDK errors can have status in error.status or error.response?.status
      const statusCode = error.status || error.response?.status || error.statusCode;
      const errorMessage = error.message || error.response?.data?.detail || String(error);
      
      // Log error details in a safe way
      const errorDetails: any = {
        status: statusCode,
        message: errorMessage,
        model: modelName,
        baseURL: this.baseURL,
        fullEndpoint: `${this.baseURL}/chat/completions`,
        errorType: error.constructor?.name,
        errorName: error.name,
        errorCode: error.code,
      };
      
      // Safely extract response data
      if (error.response) {
        errorDetails.responseStatus = error.response.status;
        errorDetails.responseStatusText = error.response.statusText;
        errorDetails.responseData = error.response.data;
        errorDetails.responseHeaders = error.response.headers;
      }
      
      // Try to get request details
      if (error.request) {
        errorDetails.requestUrl = error.request?.url || error.request?.href;
        errorDetails.requestMethod = error.request?.method;
      }
      
      // Log error keys for debugging
      try {
        errorDetails.errorKeys = Object.keys(error);
      } catch (e) {
        errorDetails.errorKeys = 'Unable to get keys';
      }
      
      console.error(`Cluster AI API Error:`, errorDetails);
      
      // Also log the raw error for debugging
      console.error(`Raw error object:`, error);
      
      // Handle timeout errors
      if (error.name === 'AbortError' || errorMessage?.includes('timeout') || errorMessage?.includes('timed out')) {
        throw new Error(
          `Cluster AI request timed out after 60 seconds. The service may be slow or unavailable.`
        );
      }
      
      if (statusCode === 404 || errorMessage?.includes('not found') || errorMessage?.includes('404')) {
        throw new Error(
          `Cluster AI model not found: ${modelName}. Check available models. BaseURL: ${this.baseURL}`
        );
      }
      if (statusCode === 503 || error.code === "ECONNREFUSED" || errorMessage?.includes('unavailable')) {
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
      // Add timeout for streaming requests
      const timeoutMs = 120000; // 120 seconds for streaming (longer since it's progressive)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);

      try {
        const stream = await this.client.chat.completions.create({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          tools: this.buildTools(options?.tools),
          stream: true,
        }, {
          signal: abortController.signal,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      // Enhanced error handling
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        throw new Error(
          `Cluster AI request timed out after 120 seconds. The service may be slow or unavailable.`
        );
      }
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



