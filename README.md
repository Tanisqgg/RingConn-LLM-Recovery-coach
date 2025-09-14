# RingConn Gen 2 LLM Personalizer

A comprehensive health and fitness coaching application that integrates with Google Fit to provide personalized AI-powered insights and visualizations for your wellness data.

## 🎯 Overview

This application serves as your personal health coach, combining fitness data from Google Fit with AI-powered analysis to provide:

- **Real-time health metrics visualization** (heart rate, sleep, steps, calories)
- **AI-powered coaching conversations** using local LLM models
- **Interactive charts and trends** for your fitness data
- **Personalized recommendations** based on your health patterns
- **Memory system** that remembers past coaching conversations

## 🏗️ Architecture

The application consists of two main components:

### Backend (Python/Flask)
- **Data Synchronization**: Pulls fitness data from Google Fit API
- **AI Coach Agent**: Provides intelligent responses using Ollama or HuggingFace models
- **Memory System**: Stores and retrieves past coaching conversations using ChromaDB
- **Anomaly Detection**: Identifies unusual patterns in your health data
- **Visualization Engine**: Generates charts and plots for data analysis

### Frontend (React/TypeScript/Vite)
- **Interactive Dashboard**: Real-time health metrics display with Apple-inspired design
- **Chat Interface**: Conversational AI coach with modern UI
- **Advanced Data Visualization**: Interactive charts for sleep stages, heart rate trends, activity levels
- **Sleep Trends Analysis**: Detailed weekly sleep stage breakdown with real data integration
- **Responsive Design**: Modern, mobile-friendly interface with dark theme
- **Real-time Data Sync**: Live updates from Google Fit API

## 🚀 Features

### Health Metrics Tracking
- **Sleep Analysis**: Detailed sleep stage breakdown with readiness scoring and weekly trends
- **Real-time Sleep Data**: Live integration with Google Fit sleep segments
- **Heart Rate Monitoring**: Daily averages, intraday trends, and resting HR analysis
- **Activity Tracking**: Steps, calories burned, and activity patterns
- **Readiness Score**: Composite metric combining sleep, HR, and activity data
- **Data Validation**: Graceful handling of missing data with "No data" indicators

### AI Coaching
- **Conversational Interface**: Natural language interactions with your health coach
- **Personalized Insights**: AI-generated recommendations based on your data
- **Memory System**: Remembers past conversations and recommendations
- **Visual Data Requests**: Ask for charts like "plot intraday HR" or "compare steps vs calories"

### Data Visualization
- **Interactive Charts**: Sleep stage pie charts, HR trends, activity comparisons
- **Weekly Sleep Trends**: Detailed breakdown of sleep stages with real data
- **Real-time Updates**: Live data synchronization with Google Fit
- **Customizable Views**: Multiple chart types and time ranges
- **Loading States**: Smooth user experience with loading indicators
- **Error Handling**: Graceful error states for data fetching issues

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- Google Fit API credentials
- Ollama (optional, for local LLM inference)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd RingConn-gen-2-LLM-personalizer
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Set up Google Fit API credentials
# Place your credentials.json file in the project root
# The app will guide you through OAuth setup on first run
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Environment Configuration
Create a `.env` file with the following variables:
```env
# Optional: Ollama configuration
OLLAMA_BASE=http://localhost:11434
OLLAMA_MODEL=llama2:7b

# Optional: HuggingFace model
ENABLE_HF=1
COACH_MODEL=tiiuae/falcon-7b-instruct

# Timezone (optional, defaults to America/Chicago)
APP_TZ=America/Chicago
```

## 🚀 Running the Application

### Option 1: Quick Start (Production Build)
```bash
python run_app.py
```
This will build the frontend and start the server. The application will be available at `http://localhost:5000`

### Option 2: Development Mode

**Windows:**
```cmd
# Command Prompt
dev.bat

# PowerShell
.\dev.ps1

# Python (if Node.js is installed)
python dev.py
```

**Linux/Mac:**
```bash
python dev.py
```

This will start both the frontend development server (http://localhost:3000) and backend server (http://localhost:5000) simultaneously.

### Option 3: Manual Setup
```bash
# Terminal 1: Start backend
python -m app.server

# Terminal 2: Start frontend (development)
cd frontend
npm run dev
```

### Access the Application
- **Production**: http://localhost:5000
- **Development**: http://localhost:3000 (with hot reload)

## 📊 Data Sources

The application synchronizes data from Google Fit, including:

- **Sleep Data**: Sleep stages, duration, and quality metrics
- **Heart Rate**: Daily averages, intraday measurements, resting HR
- **Activity**: Steps, calories burned, active minutes
- **Sessions**: Workout and activity session data

## 🤖 AI Models

The application supports multiple AI backends:

### Ollama (Recommended)
- Local inference for privacy
- Supports various models (Llama, Mistral, etc.)
- Fast response times

### HuggingFace Transformers
- Fallback option for local models
- Supports Falcon, Phi-3, and other models
- Requires sufficient system resources

## 💬 Usage Examples

### Chat with Your Coach
```
You: "How did I sleep last night?"
Coach: "Based on your sleep data, you got 7.2 hours of sleep with good REM and deep sleep stages..."

You: "Plot my heart rate for the last 7 days"
Coach: "Here's your heart rate trend chart" [displays interactive chart]

You: "Compare my steps vs calories this week"
Coach: "Here's a comparison of your activity and calorie burn" [shows comparison chart]
```

### Data Synchronization
- Click "Sync Google Fit" to pull the latest data
- Data is automatically processed and stored locally
- Charts and metrics update in real-time

## 🔧 Configuration

### Google Fit API Setup
1. Create a project in Google Cloud Console
2. Enable the Fitness API
3. Create OAuth 2.0 credentials
4. Download `credentials.json` to the project root
5. Run the app and complete OAuth flow

### Model Configuration
- **Ollama**: Install and pull your preferred model
- **HuggingFace**: Set `ENABLE_HF=1` and specify model in environment

## 📁 Project Structure

```
├── app/                    # Backend Python application
│   ├── server.py          # Flask web server
│   ├── coach_agent.py     # AI coaching logic
│   ├── fit_sync.py        # Google Fit integration
│   ├── memory.py          # ChromaDB memory system
│   ├── anomaly_detector.py # Health pattern analysis
│   └── ...
├── frontend/              # React/TypeScript frontend
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── components/    # UI components
│   │   ├── services/      # API client
│   │   ├── hooks/         # Custom React hooks
│   │   └── ui/            # UI component library
│   └── ...
├── data/                  # Local data storage
│   ├── *.csv             # Fitness data files
│   └── chroma_store/     # Vector database
├── run_app.py            # Production build script
├── dev.py                # Development script
└── requirements.txt       # Python dependencies
```

## 🔒 Privacy & Security

- **Local Data Storage**: All fitness data is stored locally
- **No Cloud Dependencies**: AI models run locally (with Ollama)
- **OAuth Security**: Secure Google Fit API integration
- **Data Encryption**: Sensitive data is handled securely

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Google Fit Sync Fails**
- Verify your `credentials.json` file is in the project root
- Check that the Fitness API is enabled in Google Cloud Console
- Ensure OAuth scopes include sleep, heart rate, and activity data

**AI Model Not Responding**
- For Ollama: Ensure the service is running and the model is pulled
- For HuggingFace: Check system resources and model availability
- Verify environment variables are set correctly

**Charts Not Displaying**
- Ensure the frontend is built (`npm run build` in frontend directory)
- Check browser console for JavaScript errors
- Verify data synchronization completed successfully

## 🆕 Recent Updates

### Frontend Improvements (Latest)
- **Real Sleep Data Integration**: Replaced mock data with live Google Fit sleep segments
- **Enhanced Sleep Trends**: Weekly sleep stage breakdown with actual dates and data
- **Improved Data Handling**: Graceful handling of missing sleep data with "No data" indicators
- **Better User Experience**: Added loading states and error handling for data fetching
- **Date Accuracy**: Fixed date display to show actual dates from the last week
- **TypeScript Migration**: Full TypeScript support for better development experience

### Technical Improvements
- **Data Processing**: Enhanced sleep data transformation with `processWeeklySleepData()`
- **API Integration**: Improved frontend-backend data flow for sleep metrics
- **Error Boundaries**: Better error handling and user feedback
- **Performance**: Optimized data processing and rendering

## 🔮 Future Enhancements

- [ ] Support for additional fitness trackers
- [ ] Advanced sleep analysis algorithms
- [ ] Workout recommendation engine
- [ ] Social features and sharing
- [ ] Mobile app development
- [ ] Integration with nutrition tracking

---

**Note**: This application is designed for personal use and educational purposes. Always consult with healthcare professionals for medical advice.

