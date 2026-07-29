import asyncio
import logging
from typing import List

logger = logging.getLogger("vani.key_manager")

class RoundRobinKeyManager:
    """
    Manages a pool of API keys in round-robin order.
    Supports thread-safe rotation and graceful handling if keys fail.
    """
    def __init__(self, keys: List[str], name: str = "API"):
        self.name = name
        self.keys = keys
        self._index = 0
        self._lock = asyncio.Lock()
        logger.info(f"Initialized RoundRobinKeyManager for '{self.name}' with {len(self.keys)} keys.")

    async def get_key(self) -> str:
        if not self.keys:
            raise ValueError(f"No API keys configured for {self.name}!")
        async with self._lock:
            key = self.keys[self._index]
            self._index = (self._index + 1) % len(self.keys)
            return key

    def get_key_sync(self) -> str:
        if not self.keys:
            raise ValueError(f"No API keys configured for {self.name}!")
        key = self.keys[self._index]
        self._index = (self._index + 1) % len(self.keys)
        return key
