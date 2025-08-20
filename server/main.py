from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, AsyncGenerator
from .config import settings
from .llama_setup import configure_llama_index
from .ingest import ingest_files
from .rag import query_index
import logging
from fastapi.responses import StreamingResponse

app = FastAPI(title="RAG Financial AI Agent - Python (LlamaIndex)")

# CORS configuration - restrictive by default, configurable via environment
import os
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class IngestRequest(BaseModel):
    file_paths: List[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    question: str
    top_k: int = 5
    enable_llm_rerank: Optional[bool] = None
    enable_rerank: Optional[bool] = None
    sentence_window_size: Optional[int] = None


@app.on_event("startup")
async def on_startup():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings.storage_root.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.index_dir.mkdir(parents=True, exist_ok=True)
    configure_llama_index()


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/ingest")
async def ingest(req: IngestRequest, request: Request):
    logging.getLogger("api").info("/ingest from %s with %d path(s)", request.client.host if request.client else "?", len(req.file_paths))
    if not req.file_paths:
        return {"ingested": 0}
    count = ingest_files(req.file_paths)
    return {"ingested": count}


@app.post("/chat")
async def chat(req: ChatRequest, request: Request):
    logging.getLogger("api").info("/chat from %s qlen=%d", request.client.host if request.client else "?", len(req.question))
    result = query_index(
        req.question,
        top_k=req.top_k,
        enable_rerank=req.enable_rerank,
        enable_llm_rerank=req.enable_llm_rerank,
        sentence_window_size=req.sentence_window_size,
    )
    return result


@app.post("/chat_stream")
async def chat_stream(req: ChatRequest, request: Request):
    logging.getLogger("api").info("/chat_stream from %s qlen=%d", request.client.host if request.client else "?", len(req.question))

    def sse_format(data: str, event: Optional[str] = None) -> bytes:
        if event:
            return (f"event: {event}\n" + f"data: {data}\n\n").encode("utf-8")
        return (f"data: {data}\n\n").encode("utf-8")

    async def token_generator() -> AsyncGenerator[bytes, None]:
        # Build query engine with same params but streaming
        from llama_index.core import StorageContext, load_index_from_storage
        from llama_index.core.postprocessor import LLMRerank, SentenceTransformerRerank

        configure_llama_index()
        storage_context = StorageContext.from_defaults(persist_dir=str(settings.index_dir))
        index = load_index_from_storage(storage_context=storage_context)

        top_k = req.top_k or settings.similarity_top_k_default
        window_size = req.sentence_window_size or settings.sentence_window_size

        node_postprocessors = []
        effective_rerank = settings.enable_rerank if req.enable_rerank is None else req.enable_rerank
        effective_llm_rerank = settings.enable_llm_rerank if req.enable_llm_rerank is None else req.enable_llm_rerank
        if effective_rerank:
            try:
                node_postprocessors.append(SentenceTransformerRerank(top_n=settings.rerank_top_n, model=settings.rerank_model))
            except Exception as e:
                import logging as _logging
                _logging.getLogger("api").warning(
                    "SentenceTransformerRerank unavailable, skipping (install torch & sentence-transformers). Reason: %s",
                    e,
                )
        if effective_llm_rerank:
            node_postprocessors.append(LLMRerank(choice_top_k=settings.llm_rerank_top_n))

        query_engine = index.as_query_engine(
            similarity_top_k=top_k,
            node_postprocessors=node_postprocessors,
            streaming=True,
        )
        response = query_engine.query(req.question)

        # Stream tokens
        try:
            for token in response.response_gen:  # type: ignore[attr-defined]
                if token:
                    yield sse_format(token)
        except Exception:
            pass

        # Send sources at the end
        sources: List[dict] = []
        try:
            for sn in response.source_nodes:  # type: ignore[attr-defined]
                meta = sn.node.metadata if hasattr(sn, "node") else {}
                text = getattr(sn, "text", None) or (sn.node.get_content() if hasattr(sn, "node") else None)
                snippet = None
                if isinstance(text, str):
                    t = text.strip().replace("\n", " ")
                    snippet = (t[:240] + ("…" if len(t) > 240 else "")) if t else None
                score_val = getattr(sn, "score", None)
                try:
                    if score_val is not None:
                        score_val = float(score_val)
                except Exception:
                    pass
                sources.append({
                    "score": score_val,
                    "text": text,
                    "metadata": meta,
                    "snippet": snippet,
                })
        except Exception:
            pass

        import json as _json
        yield sse_format(_json.dumps({"sources": sources}), event="sources")

    return StreamingResponse(token_generator(), media_type="text/event-stream")


# Entrypoint for running via `python -m server.main`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host=settings.host, port=settings.port, reload=True)
