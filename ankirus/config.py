import json
from pathlib import Path
from typing import Dict, Any


class Config:
    def __init__(self, config_path: str = "config.json"):
        self.config_path = Path(config_path)
        self._config: Dict[str, Any] = {
            "media": "collection.media\\",
            "userprofile": "C:\\Users\\11951\\AppData\\Roaming\\Anki2\\arigi\\",
            "port": 24032,
            "cache_ttl": 300,
        }
        self._load_config()

    def _load_config(self) -> None:
        if self.config_path.exists():
            with open(self.config_path, "r") as f:
                user_config = json.load(f)
                self._config.update(user_config)

    def get(self, key: str, default: Any = None) -> Any:
        return self._config.get(key, default)
