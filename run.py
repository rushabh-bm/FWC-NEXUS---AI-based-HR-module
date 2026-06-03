import uvicorn
import os

if __name__ == "__main__":
    print("Starting AI-Based HR Module Server...")
    # Ensure upload folder exists
    os.makedirs(os.path.join("public", "uploads"), exist_ok=True)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
