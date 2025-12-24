# Cluster AI API Investigation

## Date: 2025-12-08

## Overview

Investigation of the Kubernetes cluster AI infrastructure to understand API protocols and integration points for RepoMind.

## Discovered Infrastructure

### Services

- **mcp-api-server**: ClusterIP service on port 8000

  - Cluster IP: 10.43.23.252:8000
  - Endpoint: 192.168.0.10:8000

- **ai-routing-api**: ClusterIP service on port 8001
  - Cluster IP: 10.43.159.217:8001
  - Endpoint: 192.168.0.10:8000 (same as mcp-api-server)

### Ingress Configuration

- **Host**: `api.askcollections.com`
- **Paths**:
  - `/api` → ai-routing-api:8001
  - `/mcp` → mcp-api-server:8000
  - `/health` → ai-routing-api:8001

## API Protocol Analysis

### Health Endpoint

**URL**: `https://api.askcollections.com/health`

**Response**:

```json
{
  "message": "MCP API Server",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "mcp": "/mcp",
    "llm_models": "/v1/models",
    "llm_chat": "/v1/chat/completions",
    "llm_completions": "/v1/completions"
  }
}
```

### API Structure

The API is **OpenAI-compatible** with the following endpoints:

1. **Models List**: `/mcp/v1/models` or `/api/v1/models`
2. **Chat Completions**: `/mcp/v1/chat/completions` or `/api/v1/chat/completions`
3. **Completions**: `/mcp/v1/completions` or `/api/v1/completions`

### Available Models

**Endpoint**: `https://api.askcollections.com/mcp/v1/models`

**Response**:

```json
{
  "object": "list",
  "data": [
    {
      "id": "/app/models/text_generation/qwen2.5-7b-instruct",
      "object": "model",
      "created": 1766540779,
      "owned_by": "vllm",
      "root": "/app/models/text_generation/qwen2.5-7b-instruct",
      "parent": null,
      "max_model_len": 32768,
      "permission": [...]
    }
  ]
}
```

**Available Model**: `qwen2.5-7b-instruct`

- Max context length: 32,768 tokens
- Backend: vLLM

### Chat Completions Endpoint

**URL**: `https://api.askcollections.com/mcp/v1/chat/completions`

**Request Format** (OpenAI-compatible):

```json
{
  "model": "/app/models/text_generation/qwen2.5-7b-instruct",
  "messages": [
    {
      "role": "user",
      "content": "Your prompt here"
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**Response Format** (OpenAI-compatible):

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "/app/models/text_generation/qwen2.5-7b-instruct",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Response text here"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## Authentication

**Status**: No authentication required (based on testing)

- No API key needed for basic requests
- May require authentication in production (to be verified)

## Streaming Support

**Status**: To be tested

- OpenAI-compatible APIs typically support `"stream": true`
- Need to verify SSE (Server-Sent Events) format

## Function Calling Support

**Status**: To be tested

- OpenAI-compatible format expected
- Need to verify `tools` parameter support

## Integration Approach

### Recommended: OpenAI-Compatible Provider

Since the API is fully OpenAI-compatible, we can:

1. Reuse existing `OpenAIProvider` class
2. Configure `OPENAI_BASE_URL=https://api.askcollections.com/mcp`
3. Set model to `/app/models/text_generation/qwen2.5-7b-instruct`
4. Minimal code changes required

### Alternative Endpoints

- `/mcp/v1/*` - Direct MCP API server access
- `/api/v1/*` - Routing API access (may have load balancing)

## Next Steps

1. Test streaming support
2. Test function calling
3. Verify authentication requirements
4. Test performance and latency
5. Document rate limits (if any)



