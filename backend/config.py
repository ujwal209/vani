import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = os.path.join(os.path.dirname(__file__), ".env")

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "vani"

    GEMINI_API_KEYS: str = ""
    TAVILY_API_KEYS: str = ""
    SARVAM_API_KEYS: str = ""
    GROQ_API_KEYS: str = ""

    EMAIL_WORKER: str = ""
    APP_PASSWORD: str = ""

    JWT_SECRET: str = "vani_super_secret_jwt_key_2026_rural_policy_app"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = SettingsConfigDict(
        env_file=env_path if os.path.exists(env_path) else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def parse_keys(self, raw_str: str) -> List[str]:
        if not raw_str:
            return []
        cleaned = raw_str.replace("\n", "").replace("\r", "")
        keys = [k.strip() for k in cleaned.split(",") if k.strip()]
        return keys

    @property
    def gemini_keys_list(self) -> List[str]:
        return self.parse_keys(self.GEMINI_API_KEYS)

    @property
    def tavily_keys_list(self) -> List[str]:
        return self.parse_keys(self.TAVILY_API_KEYS)

    @property
    def sarvam_keys_list(self) -> List[str]:
        return self.parse_keys(self.SARVAM_API_KEYS)

    @property
    def groq_keys_list(self) -> List[str]:
        return self.parse_keys(self.GROQ_API_KEYS)


settings = Settings()
