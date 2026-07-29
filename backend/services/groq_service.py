import httpx
import logging
from typing import List, Dict, Any, Optional
from config import settings
from key_manager import RoundRobinKeyManager

logger = logging.getLogger("vani.groq")

groq_key_manager = RoundRobinKeyManager(settings.groq_keys_list, name="Groq AI")

# Preferred Groq models (active Groq models)
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768"
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

async def generate_policy_response_groq(
    query: str, 
    search_context: str, 
    sources: List[Dict[str, Any]], 
    language: str = "Hindi/English",
    state: str = "India"
) -> Optional[Dict[str, Any]]:
    """
    Generates policy explanation using Groq Cloud AI REST API.
    Rotates across 15 Groq API keys in round-robin fashion.
    """
    if not settings.groq_keys_list:
        logger.warning("No Groq API keys available in .env.")
        return None

    formatted_context = search_context if search_context else "\n".join([f"- {s.get('title')}: {s.get('content')}" for s in sources])
    if not formatted_context:
        formatted_context = "No specific live web results found. Use general official knowledge for Indian government schemes."

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(language=language, context=formatted_context)
    user_prompt = f"User State: {state}\nUser Question: {query}"

    num_keys = len(settings.groq_keys_list)

    for key_attempt in range(num_keys):
        api_key = await groq_key_manager.get_key()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        for model_name in GROQ_MODELS:
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 1200
            }

            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                    
                    if response.status_code == 200:
                        data = response.json()
                        choices = data.get("choices", [])
                        if choices:
                            response_text = choices[0].get("message", {}).get("content", "")
                            if response_text:
                                logger.info(f"Groq AI success with model '{model_name}' using key ...{api_key[-6:]}")
                                return {
                                    "text": response_text,
                                    "model_used": f"groq-{model_name}"
                                }
                    elif response.status_code == 429:
                        logger.warning(f"Groq Key ...{api_key[-6:]} rate limited (429). Rotating to next Groq key...")
                        break  # Rotate key immediately
                    else:
                        logger.warning(f"Groq model '{model_name}' status {response.status_code}: {response.text[:80]}")
            except Exception as e:
                logger.error(f"Error calling Groq model {model_name}: {e}")

    logger.error("All Groq API keys failed.")
    return None
