# RAG Financial AI Agent (LlamaIndex + Next.js + shadcn/ui)

- [x] Clarify LLM runtime (assume Ollama with local LLaMA)
- [x] Initialize Next.js 14 + TypeScript project
- [x] Configure Tailwind + shadcn/ui deps and base styles
- [x] Add core dependencies: `llamaindex`, `zod`, `pdf-parse`, `lucide-react`
- [x] Environment config and safety (`.env.local.example`)
- [x] Implement local storage layout under `storage/`
- [x] Implement file text extraction for: pdf, txt, md (extensible)
- [x] Implement ingestion/indexing pipeline with LlamaIndex (persisted)
- [x] Implement retrieval + RAG answer endpoint (Node runtime)
- [x] Add chat UI (shadcn-style) and upload UI
- [x] Wire UI to APIs with optimistic/stream handling
 - [x] Add basic rate limiting + validation
- [ ] Add robust chunking and metadata preservation
- [x] Add sentence-window/context-preserving retrieval strategy
 - [x] Add error handling and observability (logs)
- [x] Show citations/sources in UI
- [ ] Add docs: runbook and model selection notes
- [ ] Manual test plan and smoke test

Enhancements in progress / done:
- [x] Add DOCX support in upload, Node extraction, and Python ingestion

Python LlamaIndex service:
- [x] Add FastAPI service (`server/main.py`) with `/ingest` and `/chat`
- [x] Configure Ollama LLM + embeddings and chunking
- [x] Share `storage/index` persistence with Next.js app
- [x] Update Next.js API to proxy to Python
- [x] Add `server/requirements.txt` and npm scripts

Deliverables:
- Next.js app with `app/` router
- `app/api/upload/route.ts` for uploads
- `app/api/chat/route.ts` for RAG Q&A
- `lib/llama.ts`, `lib/ingest.ts`, `lib/storage.ts`
- `components/` with shadcn-style UI primitives
- Persistent index in `storage/index`
