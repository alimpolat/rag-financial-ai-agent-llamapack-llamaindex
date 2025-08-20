# RAG Financial AI Agent

A production-ready Retrieval-Augmented Generation (RAG) system for financial document analysis, built with Next.js, FastAPI, and LlamaIndex.

## 🏗️ Architecture

This project uses a hybrid architecture combining the best of both worlds:

- **Frontend**: Next.js 14 with TypeScript, shadcn/ui, and Tailwind CSS
- **Backend**: FastAPI Python service with LlamaIndex for AI operations
- **LLM**: Local Ollama integration with configurable models
- **Storage**: Persistent vector store with metadata preservation

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI    │───▶│   FastAPI        │───▶│   LlamaIndex    │
│   (Port 3000)   │    │   (Port 8000)    │    │   + Ollama      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Upload   │    │   Document       │    │   Vector Store  │
│   Processing    │    │   Ingestion      │    │   + Metadata    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Features

### Advanced RAG Capabilities
- **Multi-format document support**: PDF, DOCX, HTML, TXT, MD
- **Intelligent chunking**: Page-based for PDFs, section-based for DOCX
- **Advanced retrieval**: Similarity search + reranking (transformer & LLM-based)
- **Streaming responses**: Real-time token generation with SSE
- **Source attribution**: Rich metadata with relevance scores

### Production-Ready
- **Rate limiting**: API endpoint protection
- **Input validation**: Comprehensive schema validation with Zod
- **Error handling**: Graceful error recovery and user feedback
- **Persistent storage**: Shared vector index between services
- **Configurable**: Environment-based configuration

### Modern UX
- **Real-time chat interface** with streaming responses
- **Source citations** with document references
- **Configurable retrieval parameters** (Top-K, reranking, window size)
- **File upload progress** and validation feedback
- **Responsive design** with shadcn/ui components

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Ollama** with a language model (e.g., `llama3`)

### Install Ollama and Models

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
ollama serve

# Pull required models (in another terminal)
ollama pull llama3                # Main language model
ollama pull nomic-embed-text      # Embedding model
```

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd Rag_AI_Advisor_Cursor_GPT5_llamapack

# Install Node.js dependencies
npm install

# Setup Python environment and dependencies
npm run py:install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit configuration (optional - defaults work for local development)
nano .env.local
```

### 3. Start Services

```bash
# Terminal 1: Start Python FastAPI backend
npm run py:serve

# Terminal 2: Start Next.js frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📖 Usage

### 1. Upload Documents
- Navigate to http://localhost:3000
- Use the "Upload Knowledge" section
- Select PDF, DOCX, HTML, TXT, or MD files
- Click "Ingest Files" to process and index documents

### 2. Ask Questions
- Use the "Financial Q&A" chat interface
- Ask questions about your uploaded documents
- Adjust retrieval parameters:
  - **Top-K**: Number of relevant chunks to retrieve (1-50)
  - **LLM Rerank**: Use LLM for result reranking
  - **Window**: Sentence window size for context (1-10)

### 3. Review Sources
- Each response includes source citations
- View document names, page numbers, and relevance scores
- Sources help verify and trace answer origins

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3` | Language model name |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model name |
| `PY_BACKEND_URL` | `http://localhost:8000` | Python backend URL |
| `CHUNK_SIZE_TOKENS` | `512` | Document chunk size |
| `CHUNK_OVERLAP_TOKENS` | `64` | Chunk overlap for context |
| `SIMILARITY_TOP_K` | `5` | Default similarity search results |
| `ENABLE_RERANK` | `false` | Enable transformer reranking |
| `ENABLE_LLM_RERANK` | `false` | Enable LLM-based reranking |

### Advanced Configuration

```bash
# Enable reranking for better results (requires additional dependencies)
echo "ENABLE_RERANK=true" >> .env.local
echo "ENABLE_LLM_RERANK=true" >> .env.local

# Install additional dependencies for reranking
source .venv/bin/activate
pip install torch sentence-transformers
```

## 🧪 Development

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── chat/          # Chat endpoints
│   │   ├── upload/        # File upload
│   │   └── health/        # Health check
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # App layout
│   └── page.tsx           # Main page
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities and integrations
│   ├── fileExtractors.ts # Document text extraction
│   ├── ingest.ts         # Document ingestion
│   ├── llama.ts          # LlamaIndex configuration
│   └── storage.ts        # Storage utilities
├── server/               # Python FastAPI backend
│   ├── main.py          # FastAPI application
│   ├── config.py        # Configuration management
│   ├── llama_setup.py   # LlamaIndex setup
│   ├── ingest.py        # Document processing
│   ├── rag.py           # RAG query processing
│   └── cli_eval.py      # CLI evaluation tools
└── storage/             # Persistent data
    ├── index/           # Vector store files
    └── uploads/         # Uploaded documents
```

### Available Scripts

```bash
# Frontend development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Backend development
npm run py:install       # Setup Python environment
npm run py:serve         # Start FastAPI server
npm run py:eval          # Run evaluation CLI

# Evaluation
QUESTIONS=questions.txt TOP_K=10 npm run py:eval
```

### Adding New File Types

1. **Frontend**: Update `fileExtractors.ts` with new extraction logic
2. **Backend**: Update `ingest.py` with corresponding processing
3. **Upload API**: Add MIME type to allowed list in `upload/route.ts`

### Customizing Retrieval

Modify retrieval behavior in `server/rag.py`:
- Adjust similarity thresholds
- Add custom post-processors
- Implement domain-specific ranking

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build individual services
docker build -t rag-frontend .
docker build -t rag-backend ./server
```

### Manual Deployment

1. **Build frontend**: `npm run build`
2. **Setup Python environment** on server
3. **Configure environment variables** for production
4. **Setup reverse proxy** (nginx) for both services
5. **Configure SSL certificates**

### Production Considerations

- **Ollama**: Consider GPU acceleration for better performance
- **Storage**: Use persistent volumes for vector index
- **Monitoring**: Add health checks and logging aggregation
- **Security**: Implement authentication and rate limiting
- **Scaling**: Consider load balancing for high traffic

## 🔍 Troubleshooting

### Common Issues

**Ollama Connection Failed**
```bash
# Check if Ollama is running
ollama list

# Restart Ollama service
ollama serve
```

**Python Dependencies**
```bash
# Recreate virtual environment
rm -rf .venv
npm run py:install
```

**Port Conflicts**
```bash
# Change ports in .env.local
echo "PY_PORT=8001" >> .env.local
echo "PORT=3001" >> .env.local
```

### Performance Tuning

- **Chunk Size**: Smaller chunks (256-512 tokens) for precise retrieval
- **Top-K**: Higher values (10-20) for comprehensive coverage
- **Reranking**: Enable for better result quality (requires more compute)
- **Embedding Model**: Try different models for domain-specific content

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Additional Resources

- [LlamaIndex Documentation](https://docs.llamaindex.ai/)
- [Ollama Model Library](https://ollama.ai/library)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
