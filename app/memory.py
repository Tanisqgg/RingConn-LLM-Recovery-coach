"""
Chroma memory for storing/retrieving coach messages.
"""
from __future__ import annotations
from typing import List, Dict, Any

from pathlib import Path
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

from . import DATA_DIR

# Use a widely compatible sentence-transformer
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
PERSIST_DIR = DATA_DIR / "chroma_store"


def init_vectorstore() -> Chroma:
    PERSIST_DIR.mkdir(parents=True, exist_ok=True)
    embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    # Create/load persistent DB
    vectordb = Chroma(persist_directory=str(PERSIST_DIR), embedding_function=embedder)
    return vectordb


def add_summaries_to_memory(date: str, messages: List[str]) -> None:
    if not messages:
        return
    vectordb = init_vectorstore()
    metadatas = [{"date": str(date), "message_id": i} for i in range(len(messages))]
    vectordb.add_texts(texts=list(messages), metadatas=metadatas)


def query_memory(query: str, k: int = 5) -> List[Dict[str, Any]]:
    vectordb = init_vectorstore()
    results = vectordb.similarity_search_with_score(query, k=k)
    out = []
    for doc, score in results:
        out.append({"message": doc.page_content, "metadata": doc.metadata, "score": float(score)})
    return out


if __name__ == "__main__":
    from .summarizer import generate_coach_messages

    d, msgs = generate_coach_messages()
    add_summaries_to_memory(d, msgs)
    print("Stored today's messages to memory.")
    res = query_memory("caffeine reminder", k=3)
    for r in res:
        print(r)