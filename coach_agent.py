from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from langchain_huggingface import HuggingFacePipeline
from langchain.agents import Tool, initialize_agent

from summarizer import generate_coach_messages
from memory import query_memory

# Use an instruction-tuned Falcon model for reliable ReAct outputs
MODEL_NAME = "tiiuae/falcon-7b-instruct"


def daily_summary():
    """
    Tool: Get today’s sleep-coach insights.
    Runs the anomaly detector and summarizer, then formats the messages.
    """
    today, msgs = generate_coach_messages()
    header = f"Coach Summary for {today}:"
    body = "\n".join(f"- {m}" for m in msgs)
    return f"{header}\n{body}"


def memory_search(query: str):
    """
    Tool: Search past coach messages by keyword.
    """
    results = query_memory(query)
    if not results:
        return "No matching past messages."
    formatted = []
    for r in results:
        formatted.append(f"{r['message']}  (score {r['score']:.2f})")
    return "\n".join(formatted)


def main():
    # 1) Load tokenizer and model (auto device mapping & dtype)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, device_map="auto", torch_dtype="auto"
    )

    # 2) Build the HF generation pipeline
    hf_pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_length=1024,
        max_new_tokens=64,
        pad_token_id=tokenizer.eos_token_id,
        do_sample=True,
        temperature=0.7,
    )
    llm = HuggingFacePipeline(pipeline=hf_pipe)

    # 3) Wrap our functions as LangChain tools
    tools = [
        Tool(name="daily_summary",
             func=daily_summary,
             description="Get today’s sleep-coach insights."),
        Tool(name="query_memory",
             func=memory_search,
             description="Search past coach messages by keyword."),
    ]

    # 4) Initialize the agent with parsing‐error handling
    agent = initialize_agent(
        tools,
        llm,
        agent="zero-shot-react-description",
        verbose=True,
        handle_parsing_errors=True,
    )

    # 5) Interactive loop
    print("🤖 RingConn Coach ready. Type 'exit' to quit.")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "exit":
            print("Goodbye!")
            break
        print("Coach:", agent.run(user_input))


if __name__ == "__main__":
    main()