import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# CONFIGURATION
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
PERSIST_DIR = "../../data/chroma_store"


def init_vectorstore():
    """
    Initialize and return a Chroma vectorstore.
    Ensures the persistence directory exists and loads or creates the store.
    """
    os.makedirs(PERSIST_DIR, exist_ok=True)

    # ✅ Fix: Create an actual instance of the embedding class
    embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    # ✅ Pass the instance, not the class itself
    vectordb = Chroma(persist_directory=PERSIST_DIR, embedding_function=embedder)
    return vectordb


def add_summaries_to_memory(date, msgs):
    vectordb = init_vectorstore()
    texts = list(msgs)
    metadatas = [{"date": str(date), "message_id": idx} for idx in range(len(texts))]
    vectordb.add_texts(texts=texts, metadatas=metadatas)


def query_memory(query, k=5):
    vectordb = init_vectorstore()
    results = vectordb.similarity_search_with_score(query, k=k)
    return [
        {"message": doc.page_content, "metadata": doc.metadata, "score": score}
        for doc, score in results
    ]


if __name__ == '__main__':
    from apps.api.summarizer import generate_coach_messages

    date, msgs = generate_coach_messages()
    add_summaries_to_memory(date, msgs)
    print("Stored today's summaries in Chroma store.")

    res = query_memory("hydration reminder", k=3)
    for r in res:
        print(r)
