from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "DependencyShield"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dependencyshield.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-dependencyshield-change-in-production-min-32-chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Rate Limiting
    AUTH_RATE_LIMIT_PER_MINUTE: int = 20
    SCAN_RATE_LIMIT_PER_MINUTE: int = 30
    
    # OSV Security Intelligence
    OSV_API_BASE_URL: str = "https://api.osv.dev/v1"
    OSV_BATCH_SIZE: int = 100
    OSV_TIMEOUT_SECONDS: float = 15.0
    OSV_MAX_RETRIES: int = 3
    OSV_RETRY_BACKOFF_FACTOR: float = 1.5
    OSV_CACHE_TTL_HOURS: int = 24
    
    # Upload limits
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    
    # AI Security Assistant (Optional)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://dependencyshield.vercel.app",
    ]


settings = Settings()
