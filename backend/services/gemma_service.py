import httpx
import logging
from typing import List, Dict, Any, Optional
from config import settings
from key_manager import RoundRobinKeyManager
from services.groq_service import generate_policy_response_groq

logger = logging.getLogger("vani.gemma")

gemini_key_manager = RoundRobinKeyManager(settings.gemini_keys_list, name="Gemma/Gemini AI")

# Standard working Google Gemini & Gemma models (ordered by speed & accuracy)
MODELS_TO_TRY = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemma-2-27b-it",
    "gemma-2-9b-it",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro"
]

SYSTEM_PROMPT_TEMPLATE = """You are Vani, a professional, clear, and reliable AI assistant designed for citizens in India to provide official government policy, scheme eligibility, application steps, and required document details.

Instructions:
1. Explain policies in clear, professional, and accessible language.
2. Structure your response into clean sections:
   - What is this Scheme / Policy?
   - Eligibility Criteria
   - Key Benefits
   - Required Documents
   - How to Apply
3. Base your answers on the official internet search results provided below.
4. CRITICAL: You MUST write your entire response strictly in the target language requested: {language}.
   - If Tamil (ta-IN / Tamil), write in Tamil script.
   - If Telugu (te-IN / Telugu), write in Telugu script.
   - If Kannada (kn-IN / Kannada), write in Kannada script.
   - If Bengali (bn-IN / Bengali), write in Bengali script.
   - If Marathi (mr-IN / Marathi), write in Marathi script.
   - If Gujarati (gu-IN / Gujarati), write in Gujarati script.
   - If Malayalam (ml-IN / Malayalam), write in Malayalam script.
   - If Punjabi (pa-IN / Punjabi), write in Gurmukhi script.
   - If Odia (or-IN / Odia), write in Odia script.
   - If Hindi (hi-IN / Hindi), write in Hindi (Devanagari).
   - If English, write in English.
   Do NOT fall back to Hindi if a different language is specified!

Search Results / Knowledge Context:
{context}
"""

async def generate_policy_response(
    query: str, 
    search_context: str, 
    sources: List[Dict[str, Any]], 
    language: str = "Hindi/English",
    state: str = "India"
) -> Dict[str, Any]:
    """
    Generates policy explanation using Google Gemma/Gemini LLM with fallback to Groq AI.
    """
    if settings.gemini_keys_list:
        formatted_context = search_context if search_context else "\n".join([f"- {s.get('title')}: {s.get('content')}" for s in sources])
        if not formatted_context:
            formatted_context = "No specific live web results found. Use general official knowledge for Indian government schemes."

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(language=language, context=formatted_context)
        user_prompt = f"User State: {state}\nUser Question: {query}"

        num_keys = len(settings.gemini_keys_list)

        # Outer loop: Try available API keys in round-robin order
        for key_attempt in range(num_keys):
            api_key = await gemini_key_manager.get_key()
            
            # Inner loop: Try available models for THIS key
            for model_name in MODELS_TO_TRY:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {"text": f"{system_prompt}\n\n{user_prompt}"}
                            ]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 1200
                    }
                }

                try:
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        response = await client.post(url, json=payload)
                        
                        if response.status_code == 200:
                            data = response.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                if parts:
                                    response_text = parts[0].get("text", "")
                                    logger.info(f"Gemma/Gemini success with model '{model_name}' using key ...{api_key[-6:]}")
                                    return {
                                        "text": response_text,
                                        "model_used": model_name
                                    }
                        elif response.status_code == 429:
                            logger.warning(f"Key ...{api_key[-6:]} rate limited (429) on '{model_name}'. Rotating to NEXT API key...")
                            break  # Stop trying models with this key, move to next key!
                        elif response.status_code == 404:
                            logger.debug(f"Model '{model_name}' not found (404) for key ...{api_key[-6:]}. Trying next model...")
                            continue  # Try next model name with same key
                        else:
                            logger.warning(f"Model '{model_name}' returned status {response.status_code}: {response.text[:80]}")
                except Exception as e:
                    logger.error(f"Error calling {model_name} with key ...{api_key[-6:]}: {e}")

    logger.warning("Falling back to Groq Cloud AI LLM (15 API Keys)...")
    groq_res = await generate_policy_response_groq(query, search_context, sources, language, state)
    if groq_res:
        return groq_res

    logger.error("All Gemma/Gemini & Groq API keys failed.")
    return {
        "text": "Sorry, I am having trouble connecting to the AI policy service right now. Please check official portals like india.gov.in or pmkisan.gov.in directly.",
        "model_used": "error_fallback"
    }
