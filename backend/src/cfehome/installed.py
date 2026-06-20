# Application definition
DJANGO_INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]


THIRD_PARTY_INSTALLED_APPS = [
    "corsheaders",
    "ninja",
    "ninja_extra",
    "ninja_jwt",
]

MY_APPS = []


# dict.fromkeys dedupes while preserving order — unlike set(), which would
# randomize app order and can break Django's load-order guarantees (e.g. admin
# after auth, app-directory template/static precedence).
INSTALLED_APPS = list(
    dict.fromkeys(DJANGO_INSTALLED_APPS + THIRD_PARTY_INSTALLED_APPS + MY_APPS)
)
