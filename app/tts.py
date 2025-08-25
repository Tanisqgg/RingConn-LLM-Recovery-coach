from __future__ import annotations
import asyncio, os, tempfile, textwrap
try:
    import edge_tts
except Exception:
    edge_tts = None

DEFAULT_VOICE = "en-US-AriaNeural"
MAX_CHARS = 300

async def _synthesize_to_file(text: str, filename: str, voice: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(filename)

def speak(text: str, filename: str | None = None, voice: str = DEFAULT_VOICE) -> str:
    if edge_tts is None: return ""
    if filename is None:
        fd, filename = tempfile.mkstemp(suffix=".mp3"); os.close(fd)
    if len(text) > MAX_CHARS:
        text = textwrap.shorten(text, MAX_CHARS, placeholder="...")
    asyncio.run(_synthesize_to_file(text, filename, voice))
    return filename