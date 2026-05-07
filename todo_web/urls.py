from django.conf import settings
from django.urls import path, re_path
from django.views.static import serve

from webapp.views import index


urlpatterns = [
    path("", index, name="index"),
    re_path(
        r"^(?P<path>app\.js|styles\.css|firebase-config\.js)$",
        serve,
        {"document_root": settings.BASE_DIR / "docs"},
    ),
]
