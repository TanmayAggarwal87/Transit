import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    port: int = int(os.getenv("PORT", "8000"))

    # Read DATABASE_URL or DB_URL directly from env (shared with backend/.env)
    raw_db_url: str = (
        os.getenv("DATABASE_URL")
        or os.getenv("DB_URL")
        or "postgresql+asyncpg://localhost:5432/Transit"
    )

    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_url: str = os.getenv("REDIS_URL", "")

    kafka_brokers: str = os.getenv("KAFKA_BROKERS", "localhost:9092")
    kafka_client_id: str = os.getenv("KAFKA_CLIENT_ID", "transit-ai-service")

    @property
    def database_url(self) -> str:
        url = self.raw_db_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    @property
    def redis_connection_url(self) -> str:
        if self.redis_url:
            return self.redis_url
        return f"redis://{self.redis_host}:{self.redis_port}"


settings = Settings()
