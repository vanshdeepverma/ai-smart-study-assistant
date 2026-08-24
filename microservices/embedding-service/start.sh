#!/bin/bash
cd "$(dirname "$0")"

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install requirements if provided (we did this manually for now, but good practice)
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

echo "Starting Embedding Service on port 8000..."
uvicorn main:app --port 8000 --host 0.0.0.0
