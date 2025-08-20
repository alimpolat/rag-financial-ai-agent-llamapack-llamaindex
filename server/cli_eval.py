from __future__ import annotations
import argparse
import json
import csv
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from .llama_setup import configure_llama_index
from .ingest import ingest_files
from .rag import query_index


def load_questions(path: Path) -> List[str]:
    lines: List[str] = []
    text = path.read_text(encoding="utf-8")
    for line in text.splitlines():
        s = line.strip()
        if s:
            lines.append(s)
    return lines


def extract_top_source(sources: List[Dict[str, Any]]) -> Tuple[Optional[str], Optional[float]]:
    if not sources:
        return None, None
    top = sources[0]
    meta = top.get("metadata") or {}
    file_label = meta.get("file_name") or meta.get("source_path") or meta.get("source")
    score = top.get("score")
    return file_label, score


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate RAG with a list of questions using Ollama and sentence-window retrieval.")
    parser.add_argument("--questions", type=str, required=True, help="Path to a .text or .txt file, one question per line")
    parser.add_argument("--top-k", type=int, default=None, help="Retriever top_k (overrides SIMILARITY_TOP_K)")
    parser.add_argument("--ingest", nargs="*", help="Optional list of file paths to ingest before evaluation")
    parser.add_argument("--out", type=str, default="eval_results.jsonl", help="Output JSONL path")
    parser.add_argument("--csv", type=str, default="eval_results.csv", help="Optional CSV summary output path")
    args = parser.parse_args()

    configure_llama_index()  # sets LLM, embeddings, and sentence splitter

    if args.ingest:
        print(f"Ingesting {len(args.ingest)} file(s)...")
        ingest_files(args.ingest)

    questions_path = Path(args.questions)
    if not questions_path.exists():
        raise SystemExit(f"Questions file not found: {questions_path}")

    questions = load_questions(questions_path)
    print(f"Loaded {len(questions)} question(s). Running evaluation...")

    out_path = Path(args.out)
    csv_path = Path(args.csv) if args.csv else None

    num_ok = 0
    jsonl_file = out_path.open("w", encoding="utf-8")
    csv_file = csv_path.open("w", encoding="utf-8", newline="") if csv_path else None
    csv_writer = csv.writer(csv_file) if csv_file else None
    if csv_writer:
        csv_writer.writerow(["question", "answer", "top_source", "score"])

    try:
        for q in questions:
            try:
                result: Dict[str, Any] = query_index(q, top_k=args.top_k)
                record = {
                    "question": q,
                    "answer": result.get("answer"),
                    "sources": result.get("sources", []),
                }
                jsonl_file.write(json.dumps(record, ensure_ascii=False) + "\n")

                if csv_writer:
                    top_src, score = extract_top_source(record["sources"])  # type: ignore[index]
                    csv_writer.writerow([q, (record["answer"] or "").strip(), top_src or "", score if score is not None else ""])
                num_ok += 1
            except Exception as e:
                jsonl_file.write(json.dumps({"question": q, "error": str(e)}) + "\n")
                if csv_writer:
                    csv_writer.writerow([q, "", "", "error: " + str(e)])
    finally:
        jsonl_file.close()
        if csv_file:
            csv_file.close()

    print(f"Wrote {num_ok} result(s) to {out_path}{' and ' + str(csv_path) if csv_path else ''}")


if __name__ == "__main__":
    main()
