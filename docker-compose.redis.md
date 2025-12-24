# Local Redis Setup

This document explains how to run Redis locally using Docker for development and testing.

## Quick Start

1. **Start Redis:**
   ```bash
   docker-compose up -d redis
   ```

2. **Verify Redis is running:**
   ```bash
   docker exec repomind-redis redis-cli ping
   # Should return: PONG
   ```

3. **Update your `.env.local`:**
   ```env
   CACHE_PROVIDER=redis
   REDIS_URL=redis://localhost:6379
   ```

4. **Stop Redis:**
   ```bash
   docker-compose down redis
   ```

## Configuration

The Redis container is configured with:
- **Port**: `6379` (standard Redis port)
- **Persistence**: Enabled with AOF (Append Only File)
- **Health Check**: Automatic ping every 5 seconds
- **Data Volume**: `repomind_redis-data` (persists data between restarts)

## Connection Details

- **Host**: `localhost`
- **Port**: `6379`
- **URL**: `redis://localhost:6379`
- **No password**: Local development (no authentication)

## Troubleshooting

### Check Redis Status
```bash
docker ps | grep redis
docker logs repomind-redis
```

### Test Connection
```bash
docker exec repomind-redis redis-cli ping
```

### Clear Redis Data
```bash
docker-compose down -v redis  # Removes volume
docker-compose up -d redis     # Recreates with fresh data
```

### View Redis Data
```bash
docker exec -it repomind-redis redis-cli
# Then use Redis commands:
# KEYS *
# GET <key>
# FLUSHALL (clears all data)
```

## Production vs Development

- **Development**: Use `redis://localhost:6379` (local Docker)
- **Production**: Use `redis://redis-cluster.redis.svc.cluster.local:6379?cluster=true` (Kubernetes cluster)

The application automatically detects cluster mode based on the URL format.


