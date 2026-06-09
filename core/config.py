"""
Configuration module for LoadKaro API.
Handles environment variables and application settings.
"""
from typing import Optional
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # Database
    database_url: str = "postgresql+asyncpg://loadkaro:loadkaro@localhost:5432/loadkaro"
    
    # Environment
    environment: str = "development"
    debug: bool = True
    log_level: str = "info"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    
    # API
    api_title: str = "LoadKaro API"
    api_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    
    # CORS
    cors_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]
    
    # Geospatial defaults
    default_search_radius_km: float = 5.0
    
    # Redis (for auction engine)
    redis_url: str = "redis://localhost"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


# For direct import
settings = get_settings()
