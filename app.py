from app.coach_agent import run_chat  # ✅ Use run_chat instead of agent
from app.tts import speak

def main():
    print("🛌 RingConn Recovery Coach (Type 'exit' to quit)")
    while True:
        q = input("You: ")
        if q.lower() in ("exit", "quit"):
            break
        ans = run_chat(q)  # ✅ Call the chat function directly
        print("Coach:", ans)
        try:
            audio = speak(ans)
            print(f"(Audio saved to {audio})")
        except Exception as e:
            print(f"(TTS Error: {e})")

if __name__ == "__main__":
    main()
