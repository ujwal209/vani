import sys
import os

# Ensure backend root is importable
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Verify fastapi is importable before anything else
try:
    import fastapi
except ImportError as e:
    raise RuntimeError(f"fastapi not installed in Vercel runtime. Error: {e}")

from mangum import Mangum
from main import app

# Vercel Python Serverless handler
handler = Mangum(app, lifespan="off")
