import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('UI_API_KEY', 'agentshub_secure_key_2026')

req = urllib.request.Request('http://localhost:3434/api/agents/test0/chat', method='POST')
req.add_header('Content-Type', 'application/json')
req.add_header('x-api-key', api_key)

data = json.dumps({
    "message": "terminal ile ls komutu ver",
    "history": [],
    "configOverrides": {"thinkingEnabled": False, "model": "gemini-3.1-pro-preview"}
}).encode('utf-8')

with urllib.request.urlopen(req, data=data) as response:
    for line in response:
        decoded = line.decode('utf-8')
        print(f"RAW: {decoded}")
