from llama_index.core import Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.core.node_parser import SentenceSplitter
from .config import settings

_configured = False


def configure_llama_index() -> None:
    global _configured
    if _configured:
        return
    # Configure LLM and Embeddings to Ollama
    Settings.llm = Ollama(model=settings.ollama_model, base_url=settings.ollama_base_url, request_timeout=120.0)
    Settings.embed_model = OllamaEmbedding(model_name=settings.ollama_embed_model, base_url=settings.ollama_base_url)
    # Chunking
    Settings.node_parser = SentenceSplitter(
        chunk_size=settings.chunk_size_tokens, chunk_overlap=settings.chunk_overlap_tokens
    )
    _configured = True
