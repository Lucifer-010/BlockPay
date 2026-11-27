import os
from .base import *

DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in ("true", "1", "yes")

# Reverse Proxy (Traefik SSL termination)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# Security Headers & Cookies
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True").lower() in ("true", "1", "yes")
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True").lower() in ("true", "1", "yes")
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Celery Beat Periodic Tasks
CELERY_BEAT_SCHEDULE = {
    "recalculate-balances-hourly": {
        "task": "core.tasks.recalculate_group_balances_task",
        "schedule": 3600.0,
        "args": (1,),
    },
}
