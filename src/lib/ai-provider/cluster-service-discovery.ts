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
    const serviceName =
      process.env.CLUSTER_AI_SERVICE || "mcp-api-server";
    const namespace =
      process.env.CLUSTER_AI_NAMESPACE || "ai-infrastructure";
    const port = process.env.CLUSTER_AI_PORT || "8000";
    const path = process.env.CLUSTER_AI_PATH || "/mcp";

    return {
      baseURL: `http://${serviceName}.${namespace}.svc.cluster.local:${port}${path}`,
      isInternal: true,
      serviceName,
      namespace,
    };
  } else {
    // External access - use ingress
    const ingressURL =
      process.env.CLUSTER_AI_ENDPOINT || "https://api.askcollections.com";
    const path = process.env.CLUSTER_AI_PATH || "/mcp";

    return {
      baseURL: `${ingressURL}${path}`,
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

