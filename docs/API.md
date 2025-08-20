# API Documentation

This document provides comprehensive documentation for the RAG Financial AI Agent API endpoints.

## Base URLs

- **Frontend**: `http://localhost:3000`
- **Python Backend**: `http://localhost:8000`

## Authentication

Currently, the API does not require authentication. In production, consider implementing:
- API key authentication
- JWT tokens
- OAuth 2.0

## Rate Limiting

All endpoints are rate-limited to prevent abuse:
- **Upload endpoints**: 20 requests per minute per IP
- **Chat endpoints**: 60 requests per minute per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit window resets

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Human-readable error message",
  "type": "ERROR_TYPE",
  "details": "Technical details (development only)"
}
```

### Error Types

| Type | Status Code | Description |
|------|-------------|-------------|
| `VALIDATION` | 400 | Invalid input data |
| `AUTHENTICATION` | 401 | Authentication required |
| `AUTHORIZATION` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `FILE_UPLOAD` | 400 | File upload error |
| `EXTERNAL_SERVICE` | 502 | Backend service error |
| `INTERNAL_SERVER` | 500 | Unexpected server error |
| `NETWORK` | 503 | Network connectivity error |
| `TIMEOUT` | 504 | Request timeout |

## Endpoints

### 1. Health Check

Check the health status of the application.

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "0.1.0"
}
```

**Example**:
```bash
curl http://localhost:3000/api/health
```

---

### 2. File Upload

Upload and ingest documents into the knowledge base.

**Endpoint**: `POST /api/upload`

**Content-Type**: `multipart/form-data`

**Parameters**:
- `files` (required): One or more files to upload

**Supported File Types**:
- PDF (`.pdf`)
- Word Documents (`.docx`)
- HTML (`.html`, `.htm`)
- Plain Text (`.txt`)
- Markdown (`.md`)

**Constraints**:
- Maximum file size: 25MB per file
- Maximum total size: 100MB per request
- Maximum files: 12 per request

**Request Example**:
```bash
curl -X POST \
  -F "files=@document1.pdf" \
  -F "files=@document2.docx" \
  http://localhost:3000/api/upload
```

**Response**:
```json
{
  "ingested": 2
}
```

**Error Examples**:
```json
{
  "error": "document.exe exceeds 25MB limit",
  "type": "FILE_UPLOAD"
}
```

```json
{
  "error": "Unsupported file extension: .exe",
  "type": "FILE_UPLOAD"
}
```

---

### 3. Chat Query

Query the knowledge base with natural language questions.

**Endpoint**: `POST /api/chat`

**Content-Type**: `application/json`

**Parameters**:
```json
{
  "question": "string (required, 3-2000 characters)",
  "topK": "number (optional, 1-50, default: 6)",
  "enableLLMRerank": "boolean (optional, default: false)",
  "enableRerank": "boolean (optional, default: false)",
  "sentenceWindowSize": "number (optional, 1-10, default: 3)"
}
```

**Parameter Descriptions**:
- `question`: The question to ask about the uploaded documents
- `topK`: Number of relevant document chunks to retrieve
- `enableLLMRerank`: Use LLM-based reranking for better relevance
- `enableRerank`: Use sentence transformer reranking
- `sentenceWindowSize`: Context window size around relevant sentences

**Request Example**:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What was the revenue in Q4 2024?",
    "topK": 10,
    "enableLLMRerank": true,
    "sentenceWindowSize": 5
  }' \
  http://localhost:3000/api/chat
```

**Response**:
```json
{
  "answer": "Based on the financial documents, the revenue in Q4 2024 was $12.5 billion, representing a 15% increase compared to Q4 2023.",
  "sources": [
    {
      "score": 0.92,
      "text": "Revenue for Q4 2024 reached $12.5 billion...",
      "metadata": {
        "file_name": "Q4-2024-Report.pdf",
        "page_number": 3,
        "source_path": "/storage/uploads/Q4-2024-Report.pdf"
      },
      "snippet": "Revenue for Q4 2024 reached $12.5 billion, up 15% year-over-year..."
    }
  ]
}
```

**Caching**:
- Responses are cached for 5 minutes
- Cache key based on question and parameters
- Cached responses include `X-Cache: HIT` header

---

### 4. Streaming Chat Query

Query the knowledge base with real-time streaming responses.

**Endpoint**: `POST /api/chat/stream`

**Content-Type**: `application/json`

**Parameters**: Same as `/api/chat`

**Response Format**: Server-Sent Events (SSE)

**Event Types**:
- `data`: Token chunks of the response
- `sources`: Source information (sent at the end)

**Request Example**:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "question": "Summarize the key financial metrics",
    "topK": 8
  }' \
  http://localhost:3000/api/chat/stream
```

**Response Example**:
```
data: Based

data: on

data: the

data: financial

data: documents

event: sources
data: {"sources":[{"score":0.89,"text":"Key metrics include...","metadata":{"file_name":"report.pdf"}}]}
```

**JavaScript Client Example**:
```javascript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What are the main risks?',
    topK: 6
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const events = chunk.split('\n\n');
  
  for (const event of events) {
    if (event.startsWith('data: ')) {
      const token = event.slice(6);
      console.log(token); // Process token
    } else if (event.startsWith('event: sources')) {
      // Handle sources event
    }
  }
}
```

---

## Python Backend Endpoints

The Python FastAPI backend provides additional endpoints:

### 1. Backend Health Check

**Endpoint**: `GET http://localhost:8000/health`

**Response**:
```json
{
  "ok": true
}
```

### 2. Direct Ingestion

**Endpoint**: `POST http://localhost:8000/ingest`

**Parameters**:
```json
{
  "file_paths": ["string array of file paths"]
}
```

### 3. Direct Chat

**Endpoint**: `POST http://localhost:8000/chat`

**Parameters**: Same as frontend chat endpoint

### 4. Direct Streaming Chat

**Endpoint**: `POST http://localhost:8000/chat_stream`

**Parameters**: Same as frontend streaming endpoint

---

## SDKs and Client Libraries

### JavaScript/TypeScript Client

```typescript
class RAGClient {
  constructor(private baseUrl: string = 'http://localhost:3000') {}

  async uploadFiles(files: File[]): Promise<{ ingested: number }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }

  async query(
    question: string,
    options: {
      topK?: number;
      enableLLMRerank?: boolean;
      enableRerank?: boolean;
      sentenceWindowSize?: number;
    } = {}
  ): Promise<{ answer: string; sources: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...options }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }

  async *streamQuery(
    question: string,
    options: {
      topK?: number;
      enableLLMRerank?: boolean;
      enableRerank?: boolean;
      sentenceWindowSize?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...options }),
    });

    if (!response.ok || !response.body) {
      throw new Error(await response.text());
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n');

        for (const event of events) {
          if (event.startsWith('data: ') && !event.includes('event:')) {
            yield event.slice(6);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Usage
const client = new RAGClient();

// Upload files
await client.uploadFiles([file1, file2]);

// Query
const result = await client.query('What is the revenue?', { topK: 10 });

// Stream query
for await (const token of client.streamQuery('Summarize the document')) {
  console.log(token);
}
```

### Python Client

```python
import requests
from typing import List, Dict, Any, Iterator

class RAGClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url

    def upload_files(self, file_paths: List[str]) -> Dict[str, Any]:
        files = []
        for path in file_paths:
            with open(path, 'rb') as f:
                files.append(('files', f))
        
        response = requests.post(f"{self.base_url}/api/upload", files=files)
        response.raise_for_status()
        return response.json()

    def query(
        self,
        question: str,
        top_k: int = 6,
        enable_llm_rerank: bool = False,
        enable_rerank: bool = False,
        sentence_window_size: int = 3
    ) -> Dict[str, Any]:
        data = {
            "question": question,
            "topK": top_k,
            "enableLLMRerank": enable_llm_rerank,
            "enableRerank": enable_rerank,
            "sentenceWindowSize": sentence_window_size
        }
        
        response = requests.post(
            f"{self.base_url}/api/chat",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()

    def stream_query(
        self,
        question: str,
        top_k: int = 6,
        enable_llm_rerank: bool = False,
        enable_rerank: bool = False,
        sentence_window_size: int = 3
    ) -> Iterator[str]:
        data = {
            "question": question,
            "topK": top_k,
            "enableLLMRerank": enable_llm_rerank,
            "enableRerank": enable_rerank,
            "sentenceWindowSize": sentence_window_size
        }
        
        response = requests.post(
            f"{self.base_url}/api/chat/stream",
            json=data,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream"
            },
            stream=True
        )
        response.raise_for_status()
        
        for line in response.iter_lines(decode_unicode=True):
            if line.startswith('data: ') and 'event:' not in line:
                yield line[6:]

# Usage
client = RAGClient()

# Upload files
result = client.upload_files(["document1.pdf", "document2.docx"])

# Query
response = client.query("What is the revenue?", top_k=10)

# Stream query
for token in client.stream_query("Summarize the document"):
    print(token, end='', flush=True)
```

---

## Performance Considerations

### Response Times
- **Upload**: 2-10 seconds depending on file size and content
- **Chat Query**: 1-5 seconds depending on complexity and caching
- **Streaming**: First token in 1-2 seconds, full response in 3-8 seconds

### Caching
- Query responses cached for 5 minutes
- Document embeddings cached for 24 hours
- File content cached for 1 hour

### Optimization Tips
1. **Use caching**: Identical queries return cached results
2. **Adjust topK**: Lower values (3-5) for faster responses
3. **Disable reranking**: For faster responses at the cost of quality
4. **Use streaming**: For better user experience with long responses

---

## Monitoring and Observability

### Metrics Available
- Request duration
- Cache hit rates
- Error rates by type
- File upload sizes and counts

### Health Monitoring
```bash
# Check application health
curl http://localhost:3000/api/health

# Check Python backend health
curl http://localhost:8000/health
```

### Logs
All requests are logged with:
- Request ID
- IP address
- User agent
- Response time
- Error details (if any)

---

## Development and Testing

### Running Tests
```bash
# Frontend tests
npm test

# Python backend tests
npm run py:test

# Coverage reports
npm run test:coverage
```

### API Testing with curl
```bash
# Test upload
curl -X POST -F "files=@test.pdf" http://localhost:3000/api/upload

# Test chat
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"What is this about?"}' \
  http://localhost:3000/api/chat

# Test streaming
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"question":"Summarize this"}' \
  http://localhost:3000/api/chat/stream
```

### Postman Collection
A Postman collection is available for testing all endpoints. Import the collection from `/docs/postman-collection.json`.

---

## Security Considerations

### Input Validation
- File type restrictions
- File size limits
- Malicious content detection
- SQL injection prevention
- XSS protection

### Rate Limiting
- Per-IP rate limiting
- Configurable limits
- Graceful degradation

### CORS Configuration
- Configurable allowed origins
- Restricted to necessary methods
- Secure headers

### Recommendations for Production
1. Implement authentication
2. Use HTTPS
3. Set up proper CORS origins
4. Monitor for abuse
5. Implement request signing
6. Add API versioning
7. Use API gateways for additional security

