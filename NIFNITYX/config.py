# config.py
# Centralized settings for Python <-> Node.js communication

NODE_API_URL = "http://localhost:5000/api/trade"
NODE_NEWS_API_URL = "http://localhost:5000/api/news"

# This secret must match the one in your Node.js .env
NODE_SECRET = "nifnityx-python-key"

# FastAPI server port
PYTHON_PORT = 8000
