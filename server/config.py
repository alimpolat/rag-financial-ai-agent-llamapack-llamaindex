from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="llama3", validation_alias="OLLAMA_MODEL")
    ollama_embed_model: str = Field(default="nomic-embed-text", validation_alias="OLLAMA_EMBED_MODEL")

    storage_root: Path = Field(default=Path("storage"), validation_alias="STORAGE_ROOT")
    index_dir: Path = Field(default=Path("storage/index"), validation_alias="INDEX_DIR")
    upload_dir: Path = Field(default=Path("storage/uploads"), validation_alias="UPLOAD_DIR")

    chunk_size_tokens: int = Field(default=512, validation_alias="CHUNK_SIZE_TOKENS")
    chunk_overlap_tokens: int = Field(default=64, validation_alias="CHUNK_OVERLAP_TOKENS")

    host: str = Field(default="0.0.0.0", validation_alias="PY_HOST")
    port: int = Field(default=8000, validation_alias="PY_PORT")

    # Retrieval configuration
    similarity_top_k_default: int = Field(default=5, validation_alias="SIMILARITY_TOP_K")
    enable_rerank: bool = Field(default=False, validation_alias="ENABLE_RERANK")
    rerank_model: str = Field(default="BAAI/bge-reranker-base", validation_alias="RERANK_MODEL")
    rerank_top_n: int = Field(default=2, validation_alias="RERANK_TOP_N")
    enable_llm_rerank: bool = Field(default=False, validation_alias="ENABLE_LLM_RERANK")
    llm_rerank_top_n: int = Field(default=2, validation_alias="LLM_RERANK_TOP_N")
    sentence_window_size: int = Field(default=3, validation_alias="SENTENCE_WINDOW_SIZE")

    class Config:
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        extra = "allow"  # allow unrelated keys like PY_BACKEND_URL


settings = Settings()  # singleton
