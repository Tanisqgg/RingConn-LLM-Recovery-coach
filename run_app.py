#!/usr/bin/env python3
"""
Script to build the frontend and run the full application
"""
import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return success status"""
    print(f"Running: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, check=True)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        return False

def main():
    # Get the project root
    project_root = Path(__file__).parent
    
    # Build the frontend
    print("Building frontend...")
    frontend_dir = project_root / "frontend"
    
    if not frontend_dir.exists():
        print("Frontend directory not found!")
        return 1
    
    # Install dependencies if needed
    if not (frontend_dir / "node_modules").exists():
        print("Installing frontend dependencies...")
        if not run_command("npm install", cwd=frontend_dir):
            print("Failed to install frontend dependencies")
            return 1
    
    # Build the frontend
    if not run_command("npm run build", cwd=frontend_dir):
        print("Failed to build frontend")
        return 1
    
    print("Frontend built successfully!")
    
    # Install Python dependencies if needed
    print("Installing Python dependencies...")
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt", cwd=project_root):
        print("Failed to install Python dependencies")
        return 1
    
    # Run the Flask server
    print("Starting Flask server...")
    print("The application will be available at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    
    try:
        run_command(f"{sys.executable} -m app.server", cwd=project_root)
    except KeyboardInterrupt:
        print("\nServer stopped.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
