# Kubernetes Deployment Guide for RepoMind

## Overview

This directory contains Kubernetes manifests for deploying RepoMind to your cluster.

## Directory Structure

```
k8s/
├── base/                    # Base configuration
│   ├── deployment.yaml     # Application deployment
│   ├── service.yaml        # Service definition
│   ├── configmap.yaml      # Non-sensitive configuration
│   ├── secrets.yaml        # Secret template (DO NOT commit real values)
│   ├── ingress.yaml        # Kong ingress configuration
│   └── kustomization.yaml # Kustomize base config
└── overlays/
    ├── development/        # Development environment
    └── production/         # Production environment
```

## Prerequisites

1. Kubernetes cluster with Kong ingress controller
2. cert-manager installed (for TLS certificates)
3. Access to cluster AI infrastructure (mcp-api-server)
4. Redis cluster in the `redis` namespace (already exists in the cluster)

## Quick Start

### 1. Create Secrets

**IMPORTANT**: Never commit actual secrets to git! The `secrets.yaml` file is in `.gitignore`.

**Method 1: Using kubectl (Recommended)**

```bash
# Create namespace (if not exists)
kubectl create namespace repomind

# Create secrets directly
kubectl create secret generic repomind-secrets \
  --from-literal=github-token='your_github_token' \
  --from-literal=redis-url='redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true' \
  --from-literal=cluster-ai-api-key='' \
  --namespace=repomind
```

**Method 2: Using the template file**

```bash
# Copy the example template
cp k8s/base/secrets.example.yaml k8s/base/secrets.yaml

# Edit k8s/base/secrets.yaml with your actual values
# Then apply (this file is gitignored)
kubectl apply -f k8s/base/secrets.yaml -n repomind
```

**Method 3: Using base64 encoding**

```bash
# Encode your values
echo -n 'your_github_token' | base64
echo -n 'redis://redis-service:6379' | base64

# Create secret with encoded values
kubectl create secret generic repomind-secrets \
  --from-literal=github-token='<base64_encoded>' \
  --namespace=repomind
```

### 2. Deploy Base Configuration

```bash
# Apply base configuration
kubectl apply -k k8s/base -n repomind
```

### 3. Deploy Environment-Specific Overlay

```bash
# For development
kubectl apply -k k8s/overlays/development -n development

# For production
kubectl apply -k k8s/overlays/production -n production
```

## Configuration

### Secrets Required

The deployment expects a secret named `repomind-secrets` with:

- `github-token`: GitHub Personal Access Token (required)
- `redis-url`: Redis connection URL (optional, if using Redis)
  - **Cluster Redis**: `redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true`
  - **Standalone Redis**: `redis://redis-livekit.redis.svc.cluster.local:6379`
- `cluster-ai-api-key`: Cluster AI API key (optional, if auth required)

**Note**: The cluster has an existing Redis cluster in the `redis` namespace. The default configuration uses this cluster.

### ConfigMap Values

Non-sensitive configuration is stored in `repomind-config` ConfigMap:

- `cluster-ai-model`: Model to use (default: qwen2.5-7b-instruct)
- `cache-provider`: Cache provider (redis or vercel-kv)
- `app-name`: Application name
- `app-version`: Application version

### Environment Variables

The deployment automatically configures:

- `CLUSTER_AI_ENABLED=true` - Enables cluster AI
- `CLUSTER_AI_SERVICE=mcp-api-server` - Service name
- `CLUSTER_AI_NAMESPACE=ai-infrastructure` - Namespace
- `CLUSTER_AI_PATH=/mcp` - API path

## Customization

### Update Image

Edit `k8s/base/deployment.yaml`:

```yaml
spec:
  template:
    spec:
      containers:
        - name: repomind
          image: your-registry/repomind:tag
```

### Update Resource Limits

Edit resource requests/limits in deployment.yaml or use overlays:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Update Ingress Host

Edit `k8s/base/ingress.yaml`:

```yaml
spec:
  rules:
    - host: your-domain.com
```

## Health Checks

The deployment includes:

- **Liveness Probe**: `/health` endpoint (checks if app is running)
- **Readiness Probe**: `/ready` endpoint (checks if app is ready to serve traffic)

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n repomind
kubectl describe pod <pod-name> -n repomind
```

### Check Logs

```bash
kubectl logs -f deployment/repomind -n repomind
```

### Check Secrets

```bash
kubectl get secrets repomind-secrets -n repomind
kubectl describe secret repomind-secrets -n repomind
```

### Check ConfigMap

```bash
kubectl get configmap repomind-config -n repomind -o yaml
```

### Verify Cluster AI Connection

```bash
# From within a pod
kubectl exec -it deployment/repomind -n repomind -- curl http://mcp-api-server.ai-infrastructure.svc.cluster.local:8000/health
```

## Security Best Practices

1. **Never commit secrets to git** - Use kubectl create secret or sealed secrets
2. **Use namespaces** - Isolate environments
3. **Limit RBAC** - Use service accounts with minimal permissions
4. **Rotate secrets** - Regularly update tokens and keys
5. **Use External Secrets Operator** - For production secret management

## Production Considerations

1. **Resource Limits**: Adjust based on load
2. **Replicas**: Scale based on traffic (HPA recommended)
3. **Persistent Storage**: If needed for cache/data
4. **Monitoring**: Add Prometheus metrics
5. **Logging**: Centralized logging (ELK, Loki, etc.)
6. **Backup**: Regular backups of ConfigMaps and Secrets
