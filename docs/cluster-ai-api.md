# Cluster AI API Documentation

## Base URLs

### External Access (via Ingress)
- **MCP API Server**: `https://api.askcollections.com/mcp`
- **Routing API**: `https://api.askcollections.com/api`

### Internal Access (ClusterIP)
- **MCP API Server**: `http://mcp-api-server.ai-infrastructure.svc.cluster.local:8000`
- **Routing API**: `http://ai-routing-api.ai-infrastructure.svc.cluster.local:8001`

## Endpoints

### Health Check
```
GET /health
```

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

### List Models
```
GET /v1/models
```

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
      "max_model_len": 32768
    }
  ]
}
```

### Chat Completions
```
POST /v1/chat/completions
```

**Request**:
```json
{
  "model": "/app/models/text_generation/qwen2.5-7b-instruct",
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "top_p": 1.0,
  "stream": false
}
```

**Response**:
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
        "content": "Response text"
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

## Available Models

### qwen2.5-7b-instruct
- **Model ID**: `/app/models/text_generation/qwen2.5-7b-instruct`
- **Backend**: vLLM
- **Max Context Length**: 32,768 tokens
- **Type**: Instruction-tuned model

## Authentication

**Current Status**: No authentication required for basic access
- No API key needed in requests
- May change in production environments

## Rate Limits

**Status**: To be determined
- No rate limit information available from initial investigation
- Monitor for 429 responses

## Streaming

**Support**: Expected (OpenAI-compatible)
- Set `"stream": true` in request
- Response format: Server-Sent Events (SSE)
- Format: `data: {...}` lines

## Function Calling

**Support**: To be tested
- Expected OpenAI-compatible `tools` parameter
- Format: Array of tool definitions
- Response includes `tool_calls` in message

## Error Handling

### Common Error Responses

**404 Not Found**:
```json
{
  "detail": "Client error '404 Not Found' for url '...'"
}
```

**400 Bad Request**:
```json
{
  "error": {
    "message": "Error description",
    "type": "invalid_request_error"
  }
}
```

## Integration Notes

1. **OpenAI-Compatible**: Full OpenAI API compatibility
2. **Base URL**: Use `/mcp` or `/api` prefix depending on routing preference
3. **Model Naming**: Use full model path as model ID
4. **Context Window**: 32K tokens available
5. **No Authentication**: Currently no auth required (verify for production)




