from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

# Known development placeholder — treated as "not configured" by the security layer.
DEFAULT_AUTH_SECRET = "carbon-compass-dev-secret-change-me"


class Settings(BaseSettings):
    # API Keys
    geocoding_api_key: Optional[str] = ""
    sentinel_hub_client_id: Optional[str] = ""
    sentinel_hub_client_secret: Optional[str] = ""
    # Alibaba Cloud Model Studio (Qwen) — any OpenAI-compatible endpoint works
    qwen_api_key: Optional[str] = ""
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_text_model: str = "qwen-max"
    qwen_vision_model: str = "qwen-vl-max"

    # Durable storage: Supabase Storage (preferred) or Alibaba Cloud OSS (legacy
    # fallback). Unset → local filesystem cache only.
    alibaba_oss_access_key_id: Optional[str] = ""
    alibaba_oss_access_key_secret: Optional[str] = ""
    alibaba_oss_bucket_name: Optional[str] = ""
    alibaba_oss_endpoint: Optional[str] = ""

    # Supabase Storage
    supabase_url: Optional[str] = ""
    supabase_anon_key: Optional[str] = ""
    supabase_bucket: str = "carbon-compass"

    # Scoring
    confidence_threshold: float = 0.5
    scoring_weight_satellite: float = 0.4
    scoring_weight_disclosure: float = 0.4
    scoring_weight_shipping: float = 0.2

    # Server
    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # Auth — signed tokens (HMAC), single admin seeded on startup.
    # When AUTH_SECRET is left at the default, a random secret is generated once
    # and persisted to auth_secret_file so tokens can never be forged with the
    # known default value.
    auth_secret: str = DEFAULT_AUTH_SECRET
    auth_secret_file: str = "../data/auth_secret.key"
    auth_token_expiry_hours: int = 12
    admin_email: str = "admin@carbon-compass.local"
    admin_password: str = "admin123"

    # Paths
    data_dir: str = "../data"
    analyses_dir: str = "../data/analyses"
    satellite_dir: str = "../data/satellite"
    users_file: str = "../data/users.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @property
    def has_geocoding(self) -> bool:
        return bool(self.geocoding_api_key)

    @property
    def has_sentinel(self) -> bool:
        return bool(self.sentinel_hub_client_id and self.sentinel_hub_client_secret)

    @property
    def has_qwen(self) -> bool:
        return bool(self.qwen_api_key)

    @property
    def has_oss(self) -> bool:
        return bool(self.alibaba_oss_access_key_id and self.alibaba_oss_bucket_name)

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
