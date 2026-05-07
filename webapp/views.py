from pathlib import Path

from django.http import HttpResponse
from django.conf import settings


def index(_request):
    html = Path(settings.BASE_DIR / "docs" / "index.html").read_text(encoding="utf-8")
    return HttpResponse(html)
