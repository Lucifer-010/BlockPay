import os
import re
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-rabapay-default-dev-secret-key-change-in-production",
)

DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1,0.0.0.0,backend,web,testserver,rabapay.xyz,www.rabapay.xyz,api.rabapay.xyz,.rabapay.xyz",
    ).split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    # Local apps
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database Configuration (supports DATABASE_URL or individual POSTGRES_* environment variables)
postgres_host = os.getenv("POSTGRES_HOST")
if postgres_host:
    db_name = os.getenv("POSTGRES_DB", "rabapay_db")
    db_user = os.getenv("POSTGRES_USER", "rabapay_user")
    db_password = os.getenv("POSTGRES_PASSWORD", "rabapay_password")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    default_db_url = f"postgresql://{db_user}:{db_password}@{postgres_host}:{db_port}/{db_name}"
else:
    default_db_url = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"

DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)
DATABASES = {
    "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)
}

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS & CSRF Configuration
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "False").lower() in ("true", "1", "yes")

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "https://rabapay.xyz,https://www.rabapay.xyz,https://api.rabapay.xyz,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.rabapay\.xyz$",
    r"^http://localhost:[0-9]+$",
    r"^http://127\.0\.0\.1:[0-9]+$",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        "https://rabapay.xyz,https://www.rabapay.xyz,https://api.rabapay.xyz,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": int(os.getenv("PAGE_SIZE", "20")),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "120"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Raba Pay API",
    "DESCRIPTION": (
        "REST API for Raba Pay: shared expense and bill-splitting platform on Stellar Testnet using simulated USDC and Soroban smart contract settlement."
    ),
    "VERSION": "1.0.0",
    # Pin to a stable version without the import.meta bundle bug:
    "REDOC_DIST": "https://cdn.jsdelivr.net/npm/redoc@2.1.5",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# Redis & Celery Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "False").lower() in ("true", "1", "yes")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "rabapay-cache",
    }
}

# Stellar Testnet & Smart Contract Configuration
STELLAR_NETWORK = os.getenv("STELLAR_NETWORK", "TESTNET")
STELLAR_NETWORK_PASSPHRASE = os.getenv(
    "STELLAR_NETWORK_PASSPHRASE", "Test SDF Network ; September 2015"
)
STELLAR_HORIZON_URL = os.getenv(
    "STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org"
)
STELLAR_SOROBAN_RPC_URL = os.getenv(
    "STELLAR_SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"
)
RABAPAY_CONTRACT_ID = os.getenv(
    "RABAPAY_CONTRACT_ID",
    "CCDT474DVAO4LYDJ7UE4ZPPBN6UBNJHIRPCYAK3TEOHFGC46KNNEOEPK",
)
SIMULATED_USDC_ASSET_CODE = os.getenv("SIMULATED_USDC_ASSET_CODE", "USDC")
SIMULATED_USDC_ISSUER = os.getenv(
    "SIMULATED_USDC_ISSUER",
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
)
SIMULATED_USDC_SAC_CONTRACT_ID = os.getenv(
    "SIMULATED_USDC_SAC_CONTRACT_ID",
    "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
)
STELLAR_ADMIN_SECRET = os.getenv("STELLAR_ADMIN_SECRET", "")
STELLAR_ENABLE_LIVE_HORIZON_CHECK = os.getenv(
    "STELLAR_ENABLE_LIVE_HORIZON_CHECK", "False"
).lower() in ("true", "1", "yes")
