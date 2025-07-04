# tts.py

import asyncio
import edge_tts
import os
import tempfile

# Choose a neural voice; see https://learn.microsoft.com/azure/cognitive-services/speech-service/voices
DEFAULT_VOICE = "en-US-AriaNeural"

async def _synthesize_to_file(text: str, filename: str, voice: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(filename)

def speak(text: str, filename: str = None, voice: str = DEFAULT_VOICE):
    """
    Convert `text` to speech, save to an MP3, and play it.
    If filename is None, uses a temp file.
    """
    # Create a temp file if none provided
    if filename is None:
        fd, filename = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)

    # Run the async synth
    asyncio.run(_synthesize_to_file(text, filename, voice))

    # Play on Windows/macOS/Linux
    if os.name == "nt":
        os.system(f"start {filename}")
    elif os.uname().sysname == "Darwin":
        os.system(f"afplay {filename}")
    else:
        os.system(f"mpg123 {filename}")  # ensure mpg123 or mpg321 is installed

    return filename