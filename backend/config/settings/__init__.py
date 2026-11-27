import os

settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "config.settings")
if "production" in settings_module or os.getenv("DJANGO_DEBUG", "True").lower() not in ("true", "1", "yes"):
    from .production import *
else:
    from .base import *
