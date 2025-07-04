import os
from sentence_transformers import SentenceTransformer
from langchain.vectorstores import Chroma

# CONFIG
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
PERSIST_DIR     = "data/vectorstore"

# Initialize SentenceTransformer model for embeddings
def get_embedder():
    return SentenceTransformer(EMBEDDING_MODEL)


def init_vectorstore():
    """
    Initialize or load the Chroma vector store with SentenceTransformer embeddings.
    """
    embedder = get_embedder()
    def embedding_function(texts):
        # Returns list of embedding vectors
        embeddings = embedder.encode(texts, show_progress_bar=False)
        return embeddings.tolist()

    vectordb = Chroma(
        persist_directory=PERSIST_DIR,
        embedding_function=embedding_function
    )
    return vectordb


def add_summaries_to_memory(date, messages):
    """
    Stores the daily coach messages in the vectorstore with metadata.

    Args:
        date (datetime.date): Date of the summary
        messages (list[str]): List of coach message strings
    """
    vectordb = init_vectorstore()
    docs = []
    for idx, msg in enumerate(messages):
        metadata = {"date": str(date), "message_id": idx}
        docs.append((msg, metadata))
    vectordb.add_texts([d[0] for d in docs], metadatas=[d[1] for d in docs])
    vectordb.persist()


def query_memory(query, k=5):
    """
    Retrieves the top-k relevant past messages for context.

    Args:
        query (str): User query or prompt
        k (int): Number of results to return
    Returns:
        List of dicts with 'message', 'metadata', and 'score'
    """
    vectordb = init_vectorstore()
    results = vectordb.similarity_search_with_score(query, k=k)
    return [{"message": doc.page_content, "metadata": doc.metadata, "score": score}
            for doc, score in results]


if __name__ == '__main__':
    # Quick test integration
    from summarizer import generate_coach_messages
    date, msgs = generate_coach_messages()
    add_summaries_to_memory(date, msgs)
    print("Stored today's summaries in vectorstore.")
    res = query_memory("hydration reminder", k=3)
    for r in res:
        print(r)