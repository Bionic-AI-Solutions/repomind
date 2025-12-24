/**
 * Kubernetes Service Discovery for Cluster AI
 * Detects if running inside cluster and configures appropriate endpoints
 */

export interface ClusterAIConfig {
  baseURL: string;
  isInternal: boolean;
  serviceName: string;
  namespace: string;
}

/**
 * Detect if running inside Kubernetes cluster
 */
export function isRunningInCluster(): boolean {
  return !!(
    process.env.KUBERNETES_SERVICE_HOST &&
    process.env.KUBERNETES_SERVICE_PORT
  );
}

/**
 * Get cluster AI configuration based on environment
 */
export function getClusterAIConfig(): ClusterAIConfig {
  const isInternal = isRunningInCluster();

  // Explicit configuration takes precedence
  if (process.env.CLUSTER_AI_SERVICE_URL) {
    return {
      baseURL: process.env.CLUSTER_AI_SERVICE_URL,
      isInternal: false, // Assume external if explicitly set
      serviceName: "",
      namespace: "",
    };
  }

  if (isInternal) {
    // Running in cluster - use ClusterIP service
    // Note: Internal service doesn't use /mcp prefix, direct /v1/* endpoints
    const serviceName =
      process.env.CLUSTER_AI_SERVICE || "mcp-api-server";
    const namespace =
      process.env.CLUSTER_AI_NAMESPACE || "ai-infrastructure";
    const port = process.env.CLUSTER_AI_PORT || "8000";
    // Internal access: base URL is just the service, OpenAI client will add /v1/*
    // External ingress uses /mcp prefix, but internal service doesn't need it

    // For OpenAI SDK, baseURL needs to include /v1 for internal access too
    // The SDK will append /chat/completions to the baseURL
    // So baseURL should be: http://host:port/v1
    // SDK will call: http://host:port/v1/chat/completions
    return {
      baseURL: `http://${serviceName}.${namespace}.svc.cluster.local:${port}/v1`,
      isInternal: true,
      serviceName,
      namespace,
    };
  } else {
    // External access - use ingress
    const ingressURL =
      process.env.CLUSTER_AI_ENDPOINT || "https://api.askcollections.com";
    const path = process.env.CLUSTER_AI_PATH || "/mcp";
    
    // For external access, OpenAI SDK needs the baseURL to include /v1
    // The SDK will append /chat/completions to the baseURL
    // So baseURL should be: https://api.askcollections.com/mcp/v1
    // SDK will call: https://api.askcollections.com/mcp/v1/chat/completions
    const baseURL = `${ingressURL}${path}/v1`;

    return {
      baseURL,
      isInternal: false,
      serviceName: "",
      namespace: "",
    };
  }
}

/**
 * Get health check URL for cluster AI
 */
export function getClusterAIHealthURL(): string {
  const config = getClusterAIConfig();
  // Remove /v1/* paths and add /health
  return config.baseURL.replace(/\/v1\/.*$/, "").replace(/\/$/, "") + "/health";
}



