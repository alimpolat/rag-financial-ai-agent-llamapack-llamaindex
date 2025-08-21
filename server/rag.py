import logging
from typing import Dict, List, Optional

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.postprocessor import (
    LLMRerank,
    SentenceTransformerRerank,
)

from .config import settings
from .llama_setup import configure_llama_index


def query_index(
    question: str,
    top_k: Optional[int] = None,
    enable_rerank: Optional[bool] = None,
    enable_llm_rerank: Optional[bool] = None,
    sentence_window_size: Optional[int] = None,
) -> Dict:
    configure_llama_index()

    storage_context = StorageContext.from_defaults(persist_dir=str(settings.index_dir))
    index = load_index_from_storage(storage_context=storage_context)

    if top_k is None:
        top_k = settings.similarity_top_k_default
    window_size_effective = sentence_window_size or settings.sentence_window_size
    node_postprocessors = []
    effective_rerank = settings.enable_rerank if enable_rerank is None else enable_rerank
    effective_llm_rerank = settings.enable_llm_rerank if enable_llm_rerank is None else enable_llm_rerank
    if effective_rerank:
        try:
            node_postprocessors.append(
                SentenceTransformerRerank(top_n=settings.rerank_top_n, model=settings.rerank_model)
            )
        except Exception as e:
            logging.getLogger("rag").warning(
                "SentenceTransformerRerank unavailable, skipping (install torch & sentence-transformers). Reason: %s",
                e,
            )
    if effective_llm_rerank:
        node_postprocessors.append(LLMRerank(choice_top_k=settings.llm_rerank_top_n))

    query_engine = index.as_query_engine(
        similarity_top_k=top_k,
        node_postprocessors=node_postprocessors,
    )
    response = query_engine.query(question)

    sources: List[Dict] = []
    try:
        for sn in response.source_nodes:  # type: ignore[attr-defined]
            meta = sn.node.metadata if hasattr(sn, "node") else {}
            # Build a compact window snippet for better citations
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
            sources.append(
                {
                    "score": score_val,
                    "text": text,
                    "metadata": meta,
                    "snippet": snippet,
                }
            )
    except Exception:
        pass

    return {"answer": str(response), "sources": sources}
