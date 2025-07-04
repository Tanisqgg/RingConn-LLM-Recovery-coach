
from coach_agent import agent
from tts import speak

def main():
    print("🛌 RingConn Recovery Coach")
    while True:
        q = input("You: ")
        if q.lower() in ("exit", "quit"):  # allow exit commands
            break
        ans = agent.run(q)
        print("Coach:", ans)
        # Convert the answer to speech and play it
        audio = speak(ans)
        print(f"(Audio saved to {audio})")

if __name__ == "__main__":
    main()
