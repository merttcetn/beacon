"""Servis konfigürasyonu — tüm ayarlar .env'den okunur (kodda hardcode yok)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict

LLMFeature = str


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Gemini API ---
    gemini_api_key: str = ""
    gemini_structured_output: bool = True
    gemini_timeout_seconds: int = 60  # Pro modeller yavaş; kalite öncelik, latency ikincil
    gemini_max_retries: int = 2
    gemini_frame_interval_seconds: int = 5

    # --- LLM/VLM provider seçimi (feature/patern başına; .env'den değiştirilebilir) ---
    # Şu an structured VLM implementasyonu Gemini'de. Alanlar provider swap için hazır tutulur.
    llm_default_provider: str = "gemini"
    pattern_a_llm_provider: str = "gemini"  # Buddy Mode
    pattern_b_llm_provider: str = "gemini"  # Feedback
    pattern_c_llm_provider: str = "gemini"  # Spor
    pattern_d_llm_provider: str = "gemini"  # Voice Q&A
    seed_data_llm_provider: str = "gemini"  # n8n/seed görsel analizi

    pattern_a_llm_model: str = "gemini-3.1-pro-preview"  # Buddy — kalite öncelik
    pattern_b_llm_model: str = "gemini-3.1-pro-preview"  # Feedback — doğruluk kritik
    pattern_c_llm_model: str = "gemini-3.1-pro-preview"  # Spor — detaylı anlatım
    pattern_d_llm_model: str = "gemini-3.1-pro-preview"  # Voice Q&A — kalite öncelik
    seed_data_llm_model: str = "gemini-3.1-flash-lite"  # Batch/seed — maliyet/latency dengesi

    # Eski env adlarıyla uyumluluk: GEMINI_PATTERN_*_MODEL hâlâ çalışır.
    gemini_pattern_a_model: str = "gemini-3.1-pro-preview"  # Buddy — kalite öncelik
    gemini_pattern_b_model: str = "gemini-3.1-pro-preview"  # Feedback — doğruluk kritik
    gemini_pattern_c_model: str = "gemini-3.1-pro-preview"  # Spor — detaylı anlatım
    gemini_pattern_d_model: str = "gemini-3.1-pro-preview"  # Voice Q&A — kalite öncelik

    # --- TTS ---
    # Kabul edilen değerler: "falai"/"fal" veya "gemini".
    tts_provider: str = "falai"
    gemini_tts_model: str = "gemini-3.1-flash-tts-preview"  # TTS — en yeni
    gemini_tts_voice_name: str = "Sulafat"
    gemini_tts_timeout_seconds: int = 20
    gemini_tts_sample_rate_hz: int = 24000

    # --- fal.ai TTS ---
    # fal.ai resmi env adı FAL_KEY. Farklı isimler hackathon ortamında kolay geçiş için desteklenir.
    fal_key: str = ""
    fal_api_key: str = ""
    falai_api_key: str = ""
    falai: str = ""
    falai_tts_model: str = "fal-ai/minimax/speech-02-hd"
    falai_tts_voice_id: str = "Friendly_Person"  # hafif, samimi (kullanıcı seçimi)
    falai_tts_language_boost: str = "Turkish"
    falai_tts_output_format: str = "url"
    falai_tts_audio_format: str = "mp3"
    falai_tts_sample_rate_hz: int = 32000
    falai_tts_bitrate: int = 128000
    falai_tts_channel: int = 1
    falai_tts_speed: float = 1.1  # hafif hızlı (kullanıcı geri bildirimi)
    falai_tts_volume: float = 1.0
    falai_tts_pitch: int = 0
    falai_tts_emotion: str = "neutral"
    falai_tts_timeout_seconds: int = 30

    # --- fal.ai STT (speech-to-text) — ElevenLabs Scribe V2, Türkçe'de en yüksek doğruluk ---
    falai_stt_model: str = "fal-ai/elevenlabs/speech-to-text/scribe-v2"
    falai_stt_language: str = "tur"  # ISO 639-3; boş bırakılırsa otomatik algılama
    falai_stt_timeout_seconds: int = 45

    # --- known_issues (geo seed) ---
    known_issues_radius_m: float = 150.0

    # --- Video batch işleme ---
    video_max_frames: int = 20
    video_concurrency: int = 4

    # --- Servis ---
    service_host: str = "0.0.0.0"
    service_port: int = 8000
    log_level: str = "INFO"

    def llm_provider_for(self, feature: LLMFeature) -> str:
        """Feature/pattern için normalize edilmiş LLM provider adını döndürür."""
        providers = {
            "pattern_a": self.pattern_a_llm_provider,
            "buddy": self.pattern_a_llm_provider,
            "pattern_b": self.pattern_b_llm_provider,
            "feedback": self.pattern_b_llm_provider,
            "pattern_c": self.pattern_c_llm_provider,
            "sport": self.pattern_c_llm_provider,
            "pattern_d": self.pattern_d_llm_provider,
            "voice": self.pattern_d_llm_provider,
            "seed_data": self.seed_data_llm_provider,
        }
        return providers.get(feature, self.llm_default_provider).strip().lower()

    def llm_model_for(self, feature: LLMFeature) -> str:
        """Feature/pattern için model ID'sini döndürür.

        Generic `PATTERN_*_LLM_MODEL` alanları boş bırakılırsa eski
        `GEMINI_PATTERN_*_MODEL` alanlarına düşer.
        """
        models = {
            "pattern_a": self.pattern_a_llm_model or self.gemini_pattern_a_model,
            "buddy": self.pattern_a_llm_model or self.gemini_pattern_a_model,
            "pattern_b": self.pattern_b_llm_model or self.gemini_pattern_b_model,
            "feedback": self.pattern_b_llm_model or self.gemini_pattern_b_model,
            "pattern_c": self.pattern_c_llm_model or self.gemini_pattern_c_model,
            "sport": self.pattern_c_llm_model or self.gemini_pattern_c_model,
            "pattern_d": self.pattern_d_llm_model or self.gemini_pattern_d_model,
            "voice": self.pattern_d_llm_model or self.gemini_pattern_d_model,
            "seed_data": self.seed_data_llm_model,
        }
        return models[feature]


settings = Settings()
