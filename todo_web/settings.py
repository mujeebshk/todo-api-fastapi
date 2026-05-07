from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dev-only-change-me"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "webapp",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "todo_web.urls"
WSGI_APPLICATION = "todo_web.wsgi.application"

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "docs"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
