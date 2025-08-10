import asyncio
import edge_tts
import os
import tempfile
import textwrap

DEFAULT_VOICE = "en-US-AriaNeural"
MAX_CHARS = 300  # Edge TTS safe limit

async def _synthesize_to_file(text: str, filename: str, voice: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(filename)

def speak(text: str, filename: str = None, voice: str = DEFAULT_VOICE):
    """
    Convert `text` to speech, save to an MP3, and play it.
    If filename is None, uses a temp file.
    """
    if filename is None:
        fd, filename = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)

    # Truncate if too long
    if len(text) > MAX_CHARS:
        text = textwrap.shorten(text, MAX_CHARS, placeholder="...")

    # Run the async synth
    try:
        asyncio.run(_synthesize_to_file(text, filename, voice))
    except Exception as e:
        raise RuntimeError(f"Edge TTS failed: {e}")

    # Play audio
    if os.name == "nt":
        os.system(f"start {filename}")
    elif hasattr(os, "uname") and os.uname().sysname == "Darwin":
        os.system(f"afplay {filename}")
    else:
        os.system(f"mpg123 {filename}")

    return filename
