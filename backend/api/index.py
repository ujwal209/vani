import sys
import os
from mangum import Mangum

# Add backend root directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app

# Wrap FastAPI ASGI app with Mangum for Vercel Serverless Function execution
handler = Mangum(app, lifespan="off")
app = handler
