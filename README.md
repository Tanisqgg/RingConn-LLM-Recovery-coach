# RingConn Recovery Coach

RingConn Recovery Coach is a lightweight proof-of-concept for using LLM tools to analyze RingConn/Google Fit sleep data and provide a personal "coach" experience.  Sleep stage data is ingested from CSV or the Google Fit API, analysed for anomalies, summarised into daily messages and stored in a vector database for retrieval.  A chat interface allows the user to request advice or reports and the responses can be read aloud using text-to-speech.

## Features

- **Sleep anomaly detection** using time in each stage compared with a rolling baseline.  See `app/anomaly_detector.py` for details.
- **Daily coach messages** generated from anomalies.  Implemented in `app/summarizer.py`.
- **Chroma vector store** for remembering past messages, defined in `app/memory.py`.
- **LLM chat agent** that can summarise the latest sleep data, search memory, plot weekly pie charts or answer general wellness questions.  See `app/coach_agent.py`.
- **Command line interface** in `app.py` and a simple **Flask server** in `app/server.py` for use with the HTML dashboard in `templates/dashboardUI.html`.
- Optional **text‑to‑speech** output via Edge TTS (`app/tts.py`).

## Getting Started

1. Install dependencies (PyTorch, Transformers, LangChain, Flask, etc.):
   ```bash
   pip install transformers torch langchain langchain-huggingface langchain-chroma sentence-transformers flask flask-cors edge-tts pandas matplotlib seaborn google-auth-oauthlib google-api-python-client
   ```
   (The exact versions are not pinned and may require adjustment.)
2. Place sleep segment CSV data under `data/sleep_segments.csv` or run `app/fit_sync.py` to pull from Google Fit.
3. Generate coach messages and store them in memory:
   ```bash
   python -m app.summarizer
   ```
4. Chat with the coach:
   ```bash
   python app.py
   ```
5. Start the web dashboard (optional):
   ```bash
   python app/server.py
   ```
   and open `http://localhost:5000` in a browser.

## Repository Layout

- `app/` – application modules
  - `anomaly_detector.py` – computes daily metrics and flags anomalies
  - `fit_sync.py` – Google Fit data importer
  - `coach_agent.py` – LLM powered chat logic
  - `memory.py` – Chroma vector store helpers
  - `plotter.py` – create weekly sleep stage pie chart
  - `server.py` – Flask API for the dashboard
  - `summarizer.py` – builds daily coach messages
  - `tts.py` – optional text‑to‑speech utility
- `app.py` – command line chat interface
- `templates/dashboardUI.html` – web dashboard

This codebase is a starting point for experimenting with LLM‑driven health coaching and is not intended for production use.
