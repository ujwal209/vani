import re
import httpx
import logging
from typing import Optional, Tuple
from config import settings
from key_manager import RoundRobinKeyManager

logger = logging.getLogger("vani.sarvam")

sarvam_key_manager = RoundRobinKeyManager(settings.sarvam_keys_list, name="Sarvam AI")

# All 22 official Indian regional language codes + English
LANGUAGE_CODE_MAP = {
    "hi": "hi-IN",
    "en": "en-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "bn": "bn-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "ml": "ml-IN",
    "pa": "pa-IN",
    "or": "or-IN",
    "as": "as-IN",
    "ur": "ur-IN",
    "sat": "sat-IN",
    "ks": "ks-IN",
    "ne": "ne-IN",
    "sd": "sd-IN",
    "mai": "mai-IN",
    "doi": "doi-IN",
    "mni": "mni-IN",
    "kok": "kok-IN",
    "brx": "brx-IN",
    "sa": "sa-IN"
}

def strip_markdown_for_tts(text: str) -> str:
    """Strips asterisks, hash tags, emojis, and markdown characters so TTS audio sounds natural."""
    if not text:
        return ""
    # Remove asterisks, underscores, hashes
    clean = re.sub(r'[\*_#`~]', '', text)
    # Replace bullet point dashes at start of lines with clean pauses
    clean = re.sub(r'^\s*[-•]\s*', '', clean, flags=re.MULTILINE)
    # Remove emojis and unusual symbols while retaining all Indian language scripts (Devanagari, Tamil, Telugu, etc.) and punctuation
    clean = re.sub(r'[^\w\s.,?!:;\-\'"\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]', ' ', clean)
    # Remove multiple spaces
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

async def speech_to_text(audio_bytes: bytes, filename: str = "audio.wav", language_code: Optional[str] = None) -> Tuple[str, str]:
    """
    Converts audio bytes to text using Sarvam AI Speech-To-Text API.
    Auto-detects spoken Indian language if not specified or unknown.
    Returns (transcript, detected_language_code).
    """
    if not settings.sarvam_keys_list:
        logger.warning("No Sarvam API keys available.")
        return "", "hi-IN"

    num_attempts = len(settings.sarvam_keys_list)
    target_lang = "unknown"
    if language_code and language_code != "auto":
        target_lang = LANGUAGE_CODE_MAP.get(language_code.split("-")[0], language_code)

    for attempt in range(num_attempts):
        api_key = await sarvam_key_manager.get_key()
        headers = {
            "api-subscription-key": api_key
        }
        
        files = {
            "file": (filename, audio_bytes, "audio/wav")
        }
        for stt_model in ["saarika:v2.5", "saarika:v1"]:
            data = {
                "model": stt_model,
                "language_code": target_lang
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post("https://api.sarvam.ai/speech-to-text", headers=headers, files=files, data=data)
                    
                    if response.status_code == 200:
                        res_data = response.json()
                        transcript = res_data.get("transcript", "")
                        detected_lang = res_data.get("language_code", target_lang if target_lang != "unknown" else "hi-IN")
                        if not detected_lang or detected_lang == "unknown":
                            detected_lang = "hi-IN"

                        logger.info(f"Sarvam STT success ({stt_model}) [Lang: {detected_lang}]: '{transcript[:40]}...'")
                        return transcript, detected_lang
                    else:
                        logger.warning(f"Sarvam STT model {stt_model} failed ({response.status_code}): {response.text}")
            except Exception as e:
                logger.error(f"Error calling Sarvam STT with {stt_model}: {e}")

    logger.error("All Sarvam API keys failed for Speech-To-Text.")
    return "", "hi-IN"


async def text_to_speech(text: str, language_code: str = "hi-IN", speaker: str = "anushka") -> Optional[str]:
    """
    Converts text to spoken speech base64 audio string using Sarvam AI Text-To-Speech API.
    Truncates text to max 450 characters (Sarvam API limit is 500 chars).
    Strips markdown symbols to ensure zero 'asterisk' pronunciation in audio.
    Rotates Sarvam API key in round-robin fashion.
    """
    if not settings.sarvam_keys_list or not text:
        return None

    # Strip markdown symbols and truncate strictly to 450 chars (Sarvam limit 500 chars)
    cleaned_text = strip_markdown_for_tts(text)
    if not cleaned_text:
        return None

    if len(cleaned_text) > 450:
        cleaned_text = cleaned_text[:450].rsplit(' ', 1)[0] + "."

    num_attempts = len(settings.sarvam_keys_list)
    lang_prefix = language_code.split("-")[0]
    target_lang = LANGUAGE_CODE_MAP.get(lang_prefix, language_code)
    if "-" not in target_lang:
        target_lang = f"{target_lang}-IN"

    for attempt in range(num_attempts):
        api_key = await sarvam_key_manager.get_key()
        headers = {
            "api-subscription-key": api_key,
            "Content-Type": "application/json"
        }
        
        # Valid Sarvam TTS models: bulbul:v2 (supports all params) and bulbul:v3-beta (no pitch/loudness params)
        for tts_model in ["bulbul:v2", "bulbul:v3-beta"]:
            payload = {
                "inputs": [cleaned_text],
                "target_language_code": target_lang,
                "speaker": speaker,
                "model": tts_model
            }

            # bulbul:v2 supports custom pace and sample rate
            if tts_model == "bulbul:v2":
                payload["pace"] = 1.05
                payload["speech_sample_rate"] = 8000
                payload["enable_preprocessing"] = True

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post("https://api.sarvam.ai/text-to-speech", headers=headers, json=payload)
                    if response.status_code == 200:
                        res_data = response.json()
                        audios = res_data.get("audios", [])
                        if audios and len(audios) > 0:
                            logger.info(f"Sarvam TTS generated audio ({target_lang}) using {tts_model}.")
                            return audios[0] # base64 wav string
                    else:
                        logger.warning(f"Sarvam TTS model {tts_model} failed (status {response.status_code}): {response.text[:120]}")
            except Exception as e:
                logger.error(f"Error calling Sarvam TTS with model {tts_model}: {e}")

    logger.error("All Sarvam API keys failed for Text-To-Speech.")
    return None
