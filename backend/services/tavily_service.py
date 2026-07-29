import httpx
import logging
from typing import List, Dict, Any
from config import settings
from key_manager import RoundRobinKeyManager

logger = logging.getLogger("vani.tavily")

tavily_key_manager = RoundRobinKeyManager(settings.tavily_keys_list, name="Tavily AI")

async def search_government_policies(query: str, state: str = "India") -> Dict[str, Any]:
    """
    Searches for government policies and schemes online using Tavily API.
    Rotates Tavily API key in round-robin fashion.
    """
    if not settings.tavily_keys_list:
        logger.warning("No Tavily API keys available.")
        return {"answer": "", "results": []}

    # Enhance search query specifically for official Indian government policy context
    search_query = f"{query} India government policy scheme eligibility benefits official portal {state}".strip()

    num_attempts = len(settings.tavily_keys_list)
    for attempt in range(num_attempts):
        api_key = await tavily_key_manager.get_key()
        
        payload = {
            "api_key": api_key,
            "query": search_query,
            "search_depth": "basic",
            "include_answer": True,
            "max_results": 5
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.post("https://api.tavily.com/search", json=payload)
                if response.status_code == 200:
                    data = response.json()
                    answer = data.get("answer", "")
                    results = data.get("results", [])
                    logger.info(f"Tavily search success: found {len(results)} source links for '{query[:30]}'")
                    
                    formatted_results = []
                    for r in results:
                        formatted_results.append({
                            "title": r.get("title", "Official Source"),
                            "url": r.get("url", ""),
                            "content": r.get("content", ""),
                            "score": r.get("score", 0)
                        })
                    
                    return {
                        "answer": answer,
                        "results": formatted_results
                    }
                else:
                    logger.warning(f"Tavily search key failed (status {response.status_code}): {response.text}")
        except Exception as e:
            logger.error(f"Error calling Tavily search: {e}")

    logger.error("All Tavily API keys failed for search.")
    return {"answer": "", "results": []}
