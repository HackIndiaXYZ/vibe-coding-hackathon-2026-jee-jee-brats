"""
LoadKaro - Main Entry Point
Hyper-local freight matching platform with real-time driver discovery.
"""
from core.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
