# RingConn Health Dashboard Frontend

A modern React-based health dashboard that connects to the RingConn Flask backend.

## Development Setup

### Prerequisites
- Node.js 18+ 
- Python 3.12+ (for backend)
- pnpm (recommended) or npm

### Environment Configuration

The frontend is configured to proxy API requests to the Flask backend during development:

- **Development**: Vite proxy routes `/api` and `/chat` to `http://127.0.0.1:5000`
- **Production**: Flask serves the built frontend static files

### Running the Application

1. **Start the Flask backend** (Terminal 1):
   ```bash
   python app/server.py
   ```

2. **Start the frontend development server** (Terminal 2):
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```

3. **Open your browser** to `http://localhost:3000`

### API Integration

The frontend connects to these backend endpoints:

- `GET /api/model` - Ollama model status
- `GET /api/fit/hr/last7` - Heart rate data (last 7 days)
- `GET /api/fit/hr/intraday` - Intraday heart rate samples
- `GET /api/fit/steps/last7` - Steps data (last 7 days)
- `GET /api/fit/calories/last7` - Calories data (last 7 days)
- `GET /api/debug/sleep` - Sleep stage breakdown
- `POST /api/fit/sync` - Sync Google Fit data
- `POST /chat` - AI coach chat
- `GET /api/readiness/predict` - Readiness prediction

### Key Features

- **Real-time Health Metrics**: Displays readiness, sleep, and activity scores
- **Interactive Charts**: Trend visualizations for sleep, steps, and calories
- **AI Health Coach**: Chat interface powered by Ollama
- **Data Synchronization**: Sync with Google Fit and other health sources
- **Responsive Design**: Works on desktop and mobile devices

### Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── pages/          # Page components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and API client
│   │   ├── api.ts          # API client with TypeScript types
│   │   └── transform.ts    # Data transformation utilities
│   └── styles/             # CSS and styling
├── vite.config.ts          # Vite configuration with proxy
└── package.json            # Dependencies and scripts
```

### Building for Production

```bash
pnpm build
```

The built files will be in `frontend/build/` and served by the Flask backend.