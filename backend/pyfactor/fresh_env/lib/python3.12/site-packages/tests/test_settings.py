import os

os.environ.setdefault("DJANGO_DB_HOST", "localhost")

SITE_ID = 1

DATABASES = {
    "default": {
        "ENGINE": "django_postgrespool2",
        "NAME": "pool",
        "USER": "pool",
        "PASSWORD": "pool",
        "HOST": os.environ["DJANGO_DB_HOST"],
    }
}

DATABASE_POOL_ARGS = {
    "echo": True
}

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "tests",
]

SECRET_KEY = "local"
