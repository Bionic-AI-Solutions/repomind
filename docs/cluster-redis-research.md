# Cluster Redis Research & Configuration

## Research Date
2025-01-20

## Executive Summary

Researched the Kubernetes cluster's Redis infrastructure and configured RepoMind to use the existing Redis cluster setup. The cluster has a healthy 3-node Redis Cluster in the `redis` namespace that is now configured for RepoMind.

## Redis Infrastructure Findings

### Primary Redis Cluster

**Service**: `redis-cluster` (headless, ClusterIP: None)
- **Namespace**: `redis`
- **Type**: Redis Cluster (3 nodes)
- **StatefulSet**: `redis-cluster-ceph`
- **Ports**: 
  - 6379 (client)
  - 16379 (gossip)
- **Storage**: Ceph RBD (persistent volumes, 10Gi per node)

**Cluster Nodes**:
1. `redis-cluster-ceph-0` - IP: 10.42.9.221 - Status: Running
2. `redis-cluster-ceph-1` - IP: 10.42.6.18 - Status: Running  
3. `redis-cluster-ceph-2` - IP: 10.42.0.247 - Status: Running

**Cluster Health** (verified):
```
cluster_state: ok
cluster_slots_assigned: 16384
cluster_slots_ok: 16384
cluster_known_nodes: 3
cluster_size: 3
```

**Connection String**:
```
redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true
```

### Alternative Redis Instances

1. **redis-livekit** (standalone)
   - Service: `redis-livekit`
   - Namespace: `redis`
   - Type: Standalone Redis
   - Port: 6379
   - IP: 10.43.91.246
   - Purpose: Used by LiveKit
   - Connection: `redis://redis-livekit.redis.svc.cluster.local:6379`

2. **redis-10515** (specialized)
   - Service: `redis-10515`
   - Namespace: `redis`
   - Port: 10515
   - Purpose: Appears to be for MCP database
   - Not suitable for general caching

3. **langfuse-redis-primary** (namespace-specific)
   - Service: `langfuse-redis-primary`
   - Namespace: `langfuse`
   - Purpose: Dedicated to Langfuse
   - Not suitable for RepoMind

## Configuration Decisions

### Selected: Redis Cluster (`redis-cluster`)

**Rationale**:
1. ✅ High availability (3-node cluster with replication)
2. ✅ Persistent storage (Ceph RBD)
3. ✅ Already running and healthy
4. ✅ Supports cluster mode operations
5. ✅ Automatic failover capability
6. ✅ Scalable architecture

### Implementation

1. **Redis Provider Enhancement**
   - Updated `src/lib/cache-provider/redis-provider.ts` to support Redis Cluster mode
   - Uses ioredis `Cluster` class for cluster connections
   - Auto-detects cluster mode from URL (`?cluster=true` flag)
   - Handles node discovery and failover automatically

2. **Kubernetes Configuration**
   - **ConfigMap**: `cache-provider: "redis"`
   - **Secret**: `redis-url: "redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true"`
   - **Deployment**: References both from ConfigMap and Secrets

3. **Connection Details**
   - Service DNS: `redis-cluster.redis.svc.cluster.local`
   - Port: `6379`
   - Cluster mode: Enabled via `?cluster=true` flag
   - Authentication: None (protected-mode: no)

## Verification Tests

### Connectivity Tests

✅ **Pod-to-Pod Connectivity**: Verified
```bash
# Tested all 3 cluster nodes
kubectl run redis-test --image=redis:7.2-alpine -- redis-cli -h <node-ip> -p 6379 ping
# Result: PONG (all nodes responding)
```

✅ **Cluster Health**: Verified
```bash
kubectl exec redis-cluster-ceph-0 -n redis -- redis-cli cluster info
# Result: cluster_state:ok, all slots assigned
```

✅ **Service Discovery**: Verified
```bash
kubectl get endpoints redis-cluster -n redis
# Result: All 3 nodes listed as endpoints
```

## Configuration Files Updated

1. ✅ `k8s/base/secrets.yaml` - Redis URL configured
2. ✅ `k8s/base/secrets.example.yaml` - Example updated
3. ✅ `k8s/base/configmap.yaml` - Cache provider set to "redis"
4. ✅ `k8s/base/deployment.yaml` - Environment variables configured
5. ✅ `k8s/README.md` - Documentation updated
6. ✅ `src/lib/cache-provider/redis-provider.ts` - Cluster support added
7. ✅ `docs/redis-cluster-setup.md` - Detailed documentation created

## Deployment Instructions

### Create Secrets

```bash
kubectl create secret generic repomind-secrets \
  --from-literal=github-token='your_github_token' \
  --from-literal=redis-url='redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true' \
  --namespace=repomind
```

### Verify Configuration

```bash
# Check ConfigMap
kubectl get configmap repomind-config -n repomind -o yaml

# Check Secrets (values will be base64 encoded)
kubectl get secret repomind-secrets -n repomind -o yaml

# Verify Redis connection from pod
kubectl exec -it deployment/repomind -n repomind -- env | grep REDIS
```

## Performance Considerations

### Cluster Mode Benefits
- **High Availability**: Data replicated across 3 nodes
- **Automatic Failover**: Cluster continues if one node fails
- **Load Distribution**: Requests distributed across nodes
- **Scalability**: Can add more nodes if needed

### Limitations
- **Multi-key Operations**: Keys must be on same slot (use hash tags if needed)
- **Pipeline Operations**: May need to be split across nodes
- **Keys Command**: May not return all keys (use SCAN instead)

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify pods are running: `kubectl get pods -n redis -l app=redis-cluster-ceph`
   - Check service: `kubectl get svc redis-cluster -n redis`
   - Verify endpoints: `kubectl get endpoints redis-cluster -n redis`

2. **MOVED Errors**
   - Normal in cluster mode - client handles automatically
   - If persistent, check cluster health

3. **Cluster Not Ready**
   - Check all nodes are running
   - Verify cluster state: `kubectl exec redis-cluster-ceph-0 -n redis -- redis-cli cluster info`

## Alternative: Standalone Redis

If cluster mode causes issues, can fallback to standalone:

```yaml
redis-url: "redis://redis-livekit.redis.svc.cluster.local:6379"
```

**Note**: This provides less availability but simpler operations.

## References

- [ioredis Cluster Documentation](https://github.com/redis/ioredis#cluster)
- [Redis Cluster Specification](https://redis.io/docs/management/scaling/)
- [Kubernetes Service Discovery](https://kubernetes.io/docs/concepts/services-networking/service/#dns)




