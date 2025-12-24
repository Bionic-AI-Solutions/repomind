# Migration Guide: External AI to Cluster AI

## Overview
This guide helps you migrate RepoMind from using external paid AI APIs (OpenAI, Anthropic, Gemini) to the Kubernetes cluster's internal AI infrastructure.

## Benefits of Cluster AI

- **Cost Savings**: No external API costs
- **Performance**: Lower latency when running in-cluster
- **Privacy**: Data stays within your infrastructure
- **Reliability**: No dependency on external service availability

## Prerequisites

1. Access to Kubernetes cluster with AI infrastructure
2. Cluster AI services running (`mcp-api-server` or `ai-routing-api`)
3. Network access to cluster (ingress or cluster access)

## Migration Steps

### Step 1: Verify Cluster AI Availability

Test the cluster AI endpoint:

```bash
# External access (via ingress)
curl https://api.askcollections.com/health

# Should return:
# {"message":"MCP API Server","version":"1.0.0","status":"running",...}
```

### Step 2: Update Environment Variables

#### For External Access (Current Setup)

Edit your `.env.local`:

```env
# Enable cluster AI
CLUSTER_AI_ENABLED=true
CLUSTER_AI_ENDPOINT=https://api.askcollections.com
CLUSTER_AI_PATH=/mcp
CLUSTER_AI_MODEL=/app/models/text_generation/qwen2.5-7b-instruct

# Keep external providers as fallback (optional)
AI_PROVIDER=gemini  # Fallback if cluster unavailable
GEMINI_API_KEY=your_key_here
```

#### For In-Cluster Deployment

When deploying to Kubernetes, the configuration is automatic:

```yaml
# In k8s/base/configmap.yaml
env:
- name: CLUSTER_AI_ENABLED
  value: "true"
- name: CLUSTER_AI_SERVICE
  value: "mcp-api-server"
- name: CLUSTER_AI_NAMESPACE
  value: "ai-infrastructure"
```

### Step 3: Test the Integration

1. Start RepoMind with cluster AI enabled
2. Make a test query
3. Check logs for cluster AI usage
4. Verify responses are coming from cluster

### Step 4: Monitor and Validate

- Check response quality matches expectations
- Monitor latency and performance
- Verify fallback works if cluster unavailable
- Check error logs for any issues

## Configuration Options

### Priority Order

1. **CLUSTER_AI_ENABLED=true** - Highest priority, uses cluster AI
2. **AI_PROVIDER=cluster-ai** - Explicit cluster AI selection
3. **External providers** - Fallback if cluster unavailable

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLUSTER_AI_ENABLED` | Enable cluster AI (true/false) | `false` |
| `CLUSTER_AI_ENDPOINT` | External ingress URL | `https://api.askcollections.com` |
| `CLUSTER_AI_PATH` | API path (`/mcp` or `/api`) | `/mcp` |
| `CLUSTER_AI_MODEL` | Model to use | `/app/models/text_generation/qwen2.5-7b-instruct` |
| `CLUSTER_AI_SERVICE` | Service name (in-cluster) | `mcp-api-server` |
| `CLUSTER_AI_NAMESPACE` | Namespace (in-cluster) | `ai-infrastructure` |

## Troubleshooting

### Cluster AI Not Responding

**Symptoms**: Errors about service unavailable

**Solutions**:
1. Check cluster AI service health: `curl https://api.askcollections.com/health`
2. Verify network connectivity
3. Check if running in cluster and service discovery is working
4. Review Kubernetes service endpoints: `kubectl get endpoints -n ai-infrastructure`

### Model Not Found

**Symptoms**: 404 errors for model

**Solutions**:
1. List available models: `curl https://api.askcollections.com/mcp/v1/models`
2. Update `CLUSTER_AI_MODEL` to match available model
3. Check model ID format (must include full path)

### Fallback Not Working

**Symptoms**: Errors instead of falling back to external provider

**Solutions**:
1. Ensure external provider is still configured
2. Check error handling in provider factory
3. Verify `AI_PROVIDER` is set to a valid external provider

## Performance Comparison

### Expected Improvements

- **Latency**: 50-70% reduction when in-cluster
- **Cost**: 100% reduction (no external API costs)
- **Throughput**: Depends on cluster AI capacity

### Monitoring

Track these metrics:
- Response time (p50, p95, p99)
- Error rate
- Fallback frequency
- Token usage (if available)

## Rollback Plan

If issues occur, quickly rollback:

1. Set `CLUSTER_AI_ENABLED=false`
2. Or set `AI_PROVIDER=gemini` (or your previous provider)
3. Restart application
4. External providers will be used immediately

## Best Practices

1. **Gradual Migration**: Test with a subset of traffic first
2. **Monitor Closely**: Watch metrics during initial deployment
3. **Keep Fallback**: Maintain external provider configuration
4. **Document Issues**: Track any model-specific issues
5. **Update Documentation**: Keep cluster AI docs current

## Support

For issues:
1. Check cluster AI service logs: `kubectl logs -n ai-infrastructure`
2. Review RepoMind application logs
3. Test cluster AI endpoints directly
4. Consult cluster AI team for infrastructure issues

