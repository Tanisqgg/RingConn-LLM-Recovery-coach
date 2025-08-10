# coach_agent.py

from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from apps.api.summarizer import generate_coach_messages
from apps.api.memory import query_memory

# MODEL — use your chosen instruction-tuned model
MODEL_NAME = "tiiuae/falcon-7b-instruct"  # or mistral/zephyr etc.

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model     = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="auto",
    torch_dtype="auto"
)

# HuggingFace pipeline
hf_pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_length=512,
    max_new_tokens=256,
    pad_token_id=tokenizer.eos_token_id,
    do_sample=True,
    temperature=0.7
)

def run_chat(user_input):
    prompt = user_input.lower()

    # Case 1: Explicit report request
    if "summary" in prompt or "report" in prompt or "how did i sleep" in prompt:
        date, messages = generate_coach_messages()
        return f"🛌 Sleep Summary for {date}:\n" + "\n".join(f"• {m}" for m in messages)

    # Case 2: Memory lookup
    elif "reminder" in prompt or "hydrate" in prompt or "what did coach say" in prompt:
        results = query_memory(user_input, k=3)
        if results:
            return "\n".join(
                f"💡 '{r['message']}' (on {r['metadata']['date']})"
                for r in results
            )
        else:
            return "No relevant memories found."

        # Case 3: Graph request
    elif "pie chart" in prompt:
        from plotter import plot_weekly_pie
        img_path = plot_weekly_pie()
        return f"Here’s your weekly sleep stage pie chart: 📊\n(Image saved to {img_path})"

    # Case 4: General health/sleep advice — fall back to LLM
    else:
        seed_context = (
            "You are a personalized sleep and health coach. "
            "Give helpful, practical advice based on general wellness science. "
            "Keep it concise and supportive.\n\n"
            f"User: {user_input}\nCoach:"
        )
        response = hf_pipe(seed_context)[0]["generated_text"]
        return response.split("Coach:")[-1].strip()



if __name__ == "__main__":
    print("🤖 RingConn AI Coach ready. Ask me anything about your sleep, hydration, or health habits!")
    while True:
        q = input("You: ")
        if q.lower() in ("exit", "quit"):
            break
        reply = run_chat(q)
        print("Coach:", reply)
