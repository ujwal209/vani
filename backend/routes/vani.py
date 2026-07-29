from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Header
from pydantic import BaseModel

from db import get_database
from security import decode_access_token
from services.sarvam_service import speech_to_text, text_to_speech
from services.tavily_service import search_government_policies
from services.gemma_service import generate_policy_response

router = APIRouter(prefix="/api/vani", tags=["Vani Assistant Pipeline"])


class TextQueryRequest(BaseModel):
    query: str
    language: Optional[str] = "hi-IN"
    state: Optional[str] = "India"
    generate_audio: Optional[bool] = True


class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "hi-IN"
    speaker: Optional[str] = "anushka"


async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    db = get_database()
    return await db.users.find_one({"email": payload["sub"]})


@router.post("/stt")
async def handle_stt(
    file: UploadFile = File(...),
    language: Optional[str] = Form("hi-IN")
):
    """Standalone Speech-To-Text endpoint using Sarvam AI."""
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    transcript, detected_lang = await speech_to_text(audio_bytes, filename=file.filename or "input.wav", language_code=language)
    return {
        "success": True,
        "transcript": transcript,
        "language_code": detected_lang
    }


@router.post("/tts")
async def handle_tts(req: TTSRequest):
    """Standalone Text-To-Speech endpoint using Sarvam AI."""
    if not req.text:
        raise HTTPException(status_code=400, detail="No text provided for TTS")

    audio_b64 = await text_to_speech(req.text, language_code=req.language or "hi-IN", speaker=req.speaker or "meera")
    return {
        "success": True if audio_b64 else False,
        "audio_base64": audio_b64
    }


@router.post("/query")
async def process_text_query(
    req: TextQueryRequest,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Unified Policy Pipeline:
    Query -> Tavily Search (Sources) -> Gemma LLM (Synthesis) -> Sarvam TTS (Spoken Voice)
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty")

    query_text = req.query.strip()
    target_state = req.state or (current_user.get("state") if current_user else "India")
    target_language = req.language or (current_user.get("preferred_language") if current_user else "hi-IN")

    # Step 1: Search live government policy info with Tavily (Round Robin Keys)
    tavily_res = await search_government_policies(query=query_text, state=target_state)
    search_context = tavily_res.get("answer", "")
    sources = tavily_res.get("results", [])

    # Step 2: Synthesize simple rural-friendly policy response using Gemma/Gemini (Round Robin Keys)
    gemma_res = await generate_policy_response(
        query=query_text,
        search_context=search_context,
        sources=sources,
        language=target_language,
        state=target_state
    )
    response_text = gemma_res.get("text", "")
    model_used = gemma_res.get("model_used", "gemma-2-27b-it")

    # Step 3: Convert summary text to spoken voice audio with Sarvam TTS (Round Robin Keys)
    audio_base64 = None
    if req.generate_audio:
        audio_base64 = await text_to_speech(response_text, language_code=target_language)

    # Save query to MongoDB history
    db = get_database()
    user_id = str(current_user["_id"]) if current_user else None

    query_record = {
        "user_id": user_id,
        "query": query_text,
        "response_text": response_text,
        "sources": sources,
        "model_used": model_used,
        "language": target_language,
        "state": target_state,
        "created_at": datetime.now(timezone.utc)
    }
    await db.history.insert_one(query_record)

    return {
        "success": True,
        "query": query_text,
        "response_text": response_text,
        "audio_base64": audio_base64,
        "sources": sources,
        "model_used": model_used,
        "language": target_language,
        "state": target_state
    }


@router.post("/voice-query")
async def process_voice_query(
    file: UploadFile = File(...),
    language: Optional[str] = Form("hi-IN"),
    state: Optional[str] = Form("India"),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Full Voice-To-Voice Policy Pipeline:
    Voice Input -> Sarvam STT -> Tavily Search -> Gemma LLM -> Sarvam TTS Audio Response
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file uploaded")

    # Step 1: Sarvam STT (Speech to Text with Auto Language Detection)
    transcript, detected_lang = await speech_to_text(audio_bytes, filename=file.filename or "input.wav", language_code=language)
    if not transcript or not transcript.strip():
        return {
            "success": False,
            "error": "Could not recognize spoken speech. Please try speaking clearly again.",
            "transcript": ""
        }

    query_text = transcript.strip()
    target_state = state or (current_user.get("state") if current_user else "India")
    
    # Use detected language from speech if auto or not explicitly selected
    target_language = detected_lang if (not language or language == "auto" or language == "hi-IN") else language

    # Step 2: Tavily Search (Sources)
    tavily_res = await search_government_policies(query=query_text, state=target_state)
    search_context = tavily_res.get("answer", "")
    sources = tavily_res.get("results", [])

    # Step 3: Gemma / Groq LLM (Synthesis in detected Indian language)
    gemma_res = await generate_policy_response(
        query=query_text,
        search_context=search_context,
        sources=sources,
        language=target_language,
        state=target_state
    )
    response_text = gemma_res.get("text", "")
    model_used = gemma_res.get("model_used", "gemma-2-27b-it")

    # Step 4: Sarvam TTS (Spoken Voice Audio in detected Indian language)
    audio_base64 = await text_to_speech(response_text, language_code=target_language)

    # Save to MongoDB
    db = get_database()
    user_id = str(current_user["_id"]) if current_user else None

    await db.history.insert_one({
        "user_id": user_id,
        "query": query_text,
        "response_text": response_text,
        "sources": sources,
        "model_used": model_used,
        "language": target_language,
        "state": target_state,
        "input_type": "voice",
        "created_at": datetime.now(timezone.utc)
    })

    return {
        "success": True,
        "transcript": query_text,
        "response_text": response_text,
        "audio_base64": audio_base64,
        "sources": sources,
        "model_used": model_used,
        "language": target_language,
        "state": target_state
    }


@router.get("/history")
async def get_user_history(current_user: dict = Depends(get_optional_user)):
    if not current_user:
        return {"success": True, "history": []}

    db = get_database()
    user_id = str(current_user["_id"])
    cursor = db.history.find({"user_id": user_id}).sort("created_at", -1).limit(20)
    history_list = []
    async for item in cursor:
        item["_id"] = str(item["_id"])
        history_list.append(item)

    return {
        "success": True,
        "history": history_list
    }
