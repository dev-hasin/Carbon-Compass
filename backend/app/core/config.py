from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # API Keys
    geocoding_api_key: Optional[str] = ""
    sentinel_hub_client_id: Optional[str] = ""
    sentinel_hub_client_secret: Optional[str] = ""
    qwen_api_key: Optional[str] = ""

    # Alibaba OSS
    alibaba_oss_access_key_id: Optional[str] = ""
    alibaba_oss_access_key_secret: Optional[str] = ""
    alibaba_oss_bucket_name: Optional[str] = ""
    alibaba_oss_endpoint: Optional[str] = ""

    # Scoring
    confidence_threshold: float = 0.5
    scoring_weight_satellite: float = 0.4
    scoring_weight_disclosure: float = 0.4
    scoring_weight_shipping: float = 0.2

    # Server
    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # Paths
    data_dir: str = "../data"
    analyses_dir: str = "../data/analyses"
    satellite_dir: str = "../data/satellite"

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
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
