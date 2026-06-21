from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Skin Hearten API"
    api_v1_str: str = "/api/v1"
    frontend_url: str = "http://localhost:3000"
    database_url: str = "sqlite:///./skin_hearten.db"
    secret_key: str = "change-me"
    jwt_expire_minutes: int = 60 * 24
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    mercadopago_access_token: str = ""
    azure_blob_connection_string: str = ""
    azure_blob_container: str = "skin-hearten"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

