# Redis Cluster Integration

## Overview

RepoMind is configured to use the existing Redis cluster in the Kubernetes cluster. The Redis cluster is located in the `redis` namespace and provides high availability and scalability.

## Cluster Details

### Redis Cluster Configuration

- **Namespace**: `redis`
- **Service**: `redis-cluster`
- **Type**: Redis Cluster (3 nodes)
- **Port**: 6379 (client), 16379 (gossip)
- **StatefulSet**: `redis-cluster-ceph` (3 replicas)
- **Storage**: Ceph RBD (persistent volumes)

### Cluster Nodes

The Redis cluster consists of 3 nodes:
- `redis-cluster-ceph-0` (10.42.9.221)
- `redis-cluster-ceph-1` (10.42.6.18)
- `redis-cluster-ceph-2` (10.42.0.247)

### Service Discovery

The cluster uses a headless service (`redis-cluster`) which provides DNS resolution for all cluster nodes. The service DNS name is:
```
redis-cluster.redis.svc.cluster.local
```

## Connection Configuration

### Redis Provider Support

The `RedisProvider` class has been enhanced to support both standalone and cluster mode:

1. **Automatic Detection**: Detects cluster mode based on:
   - Explicit `?cluster=true` flag in the URL
   - Multiple comma-separated hosts
   - Hostname containing "cluster"

2. **Cluster Mode**: Uses ioredis `Cluster` class when cluster mode is detected
3. **Standalone Mode**: Uses standard ioredis `Redis` class for standalone instances

### Connection URL Format

**For Redis Cluster:**
```
redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true
```

**For Standalone Redis:**
```
redis://redis-livekit.redis.svc.cluster.local:6379
```

**Multiple Nodes (Alternative):**
```
redis://redis-cluster-ceph-0.redis-cluster.redis.svc.cluster.local:6379,redis://redis-cluster-ceph-1.redis-cluster.redis.svc.cluster.local:6379,redis://redis-cluster-ceph-2.redis-cluster.redis.svc.cluster.local:6379
```

## Configuration

### Environment Variables

Set the following in your secrets:

```yaml
redis-url: "redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true"
```

### ConfigMap

Ensure the cache provider is set to Redis:

```yaml
cache-provider: "redis"
```

## Testing the Connection

### From Within a Pod

```bash
# Test connection from a pod
kubectl run -it --rm redis-test --image=redis:7.2-alpine --restart=Never -- redis-cli -h redis-cluster.redis.svc.cluster.local -p 6379 ping
```

### From RepoMind Pod

```bash
# Exec into RepoMind pod
kubectl exec -it deployment/repomind -n repomind -- sh

# Test Redis connection (if redis-cli is available)
redis-cli -h redis-cluster.redis.svc.cluster.local -p 6379 ping
```

### Check Cluster Status

```bash
# Get cluster nodes
kubectl exec -it redis-cluster-ceph-0 -n redis -- redis-cli cluster nodes
```

## Troubleshooting

### Connection Issues

1. **Verify Service Exists:**
   ```bash
   kubectl get svc redis-cluster -n redis
   ```

2. **Check Endpoints:**
   ```bash
   kubectl get endpoints redis-cluster -n redis
   ```

3. **Verify Pods are Running:**
   ```bash
   kubectl get pods -n redis -l app=redis-cluster-ceph
   ```

4. **Check Pod Logs:**
   ```bash
   kubectl logs redis-cluster-ceph-0 -n redis
   ```

### Common Issues

1. **"MOVED" errors**: Normal in Redis Cluster - the client should handle this automatically
2. **Connection refused**: Check if pods are running and service is configured correctly
3. **Cluster not ready**: Wait for all 3 nodes to be in "Running" state

## Performance Considerations

### Cluster Mode Benefits

- **High Availability**: Data is replicated across nodes
- **Scalability**: Can handle more data and requests
- **Automatic Failover**: If a node fails, the cluster continues operating

### Limitations

- **Multi-key operations**: Some operations require keys to be on the same slot
- **Pipeline operations**: May need to be split across nodes
- **Keys command**: May not return all keys in cluster mode (use SCAN instead)

## Alternative: Standalone Redis

If you prefer to use a standalone Redis instance, the cluster also has:

- **Service**: `redis-livekit` in `redis` namespace
- **URL**: `redis://redis-livekit.redis.svc.cluster.local:6379`

This is simpler but doesn't provide the same high availability as the cluster.

## References

- [ioredis Cluster Documentation](https://github.com/redis/ioredis#cluster)
- [Redis Cluster Specification](https://redis.io/docs/management/scaling/)
- [Kubernetes Service Discovery](https://kubernetes.io/docs/concepts/services-networking/service/#dns)




