import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db import connect_to_mongo, close_mongo_connection
from routes.auth import router as auth_router
from routes.vani import router as vani_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vani.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Vani Backend API on Vercel Serverless...")
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.warning(f"Mongo startup warning: {e}")
    yield
    try:
        await close_mongo_connection()
    except Exception:
        pass

app = FastAPI(
    title="Vani - Rural & Citizen Policy Assistant API",
    description="Backend service powering voice STT/TTS (Sarvam), Tavily Search, Gemma/Groq LLM, and Email Authentication.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend & Vercel deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(vani_router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "Vani Government Policy AI Assistant",
        "version": "1.0.0",
        "keys_status": {
            "gemini_keys": len(settings.gemini_keys_list),
            "groq_keys": len(settings.groq_keys_list),
            "tavily_keys": len(settings.tavily_keys_list),
            "sarvam_keys": len(settings.sarvam_keys_list)
        }
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
