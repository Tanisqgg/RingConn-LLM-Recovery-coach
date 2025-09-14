#!/usr/bin/env python3
"""
Development runner script for RingConn Health Dashboard
Starts both Flask backend and Vite frontend
"""
import subprocess
import sys
import time
import threading
import signal
import os
from pathlib import Path

def run_backend():
    """Start the Flask backend"""
    print("🚀 Starting Flask backend...")
    try:
        subprocess.run([sys.executable, "app/server.py"], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Backend stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Backend failed to start: {e}")
        sys.exit(1)

def run_frontend():
    """Start the Vite frontend"""
    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return
    
    print("🚀 Starting Vite frontend...")
    try:
        # Check if node_modules exists, if not run install
        if not (frontend_dir / "node_modules").exists():
            print("📦 Installing frontend dependencies...")
            subprocess.run(["pnpm", "install"], cwd=frontend_dir, check=True)
        
        subprocess.run(["pnpm", "dev"], cwd=frontend_dir, check=True)
    except KeyboardInterrupt:
        print("\n🛑 Frontend stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Frontend failed to start: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ pnpm not found. Please install pnpm or use npm instead.")
        print("   You can install pnpm with: npm install -g pnpm")
        sys.exit(1)

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n🛑 Shutting down services...")
    sys.exit(0)

def main():
    print("🏥 RingConn Health Dashboard - Development Mode")
    print("=" * 50)
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # Check if we're in the right directory
    if not Path("app/server.py").exists():
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # Wait a moment for backend to start
    print("⏳ Waiting for backend to start...")
    time.sleep(3)
    
    # Start frontend
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        sys.exit(0)

if __name__ == '__main__':
    main()

