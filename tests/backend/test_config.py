import pytest

from backend.app.config import ConfigError, load_settings, normalize_database_url, normalize_supabase_url

SUPABASE_ENV = {
    "DATABASE_URL": "postgresql://postgres.ref:pw@aws-0-eu.pooler.supabase.com:5432/postgres",
    "SUPABASE_URL": "https://ref.supabase.co/",
    "SUPABASE_SERVICE_ROLE_KEY": " key ",
}


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgresql://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgres://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
    ],
)
def test_database_urls_are_normalized_to_psycopg(url, expected):
    assert normalize_database_url(url) == expected


def test_supabase_settings_and_defaults():
    settings = load_settings(SUPABASE_ENV)

    assert settings.database_url.startswith("postgresql+psycopg://postgres.ref:pw@")
    assert settings.storage_backend == "supabase"
    assert settings.supabase_url == "https://ref.supabase.co"
    assert settings.supabase_service_role_key == "key"
    assert settings.attachments_bucket == "attachments"
    assert settings.backups_bucket == "backups"
    assert (settings.host, settings.port) == ("127.0.0.1", 8000)


def test_custom_buckets_host_and_port():
    settings = load_settings(
        {
            **SUPABASE_ENV,
            "SUPABASE_ATTACHMENTS_BUCKET": "files",
            "SUPABASE_BACKUPS_BUCKET": "dumps",
            "FLOWDESK_HOST": "0.0.0.0",
            "FLOWDESK_PORT": "9000",
        }
    )
    assert (settings.attachments_bucket, settings.backups_bucket) == ("files", "dumps")
    assert (settings.host, settings.port) == ("0.0.0.0", 9000)


def test_missing_settings_are_all_listed_with_a_pointer_to_the_guide():
    with pytest.raises(ConfigError) as excinfo:
        load_settings({"SUPABASE_URL": "  "})
    message = str(excinfo.value)
    assert "DATABASE_URL" in message
    assert "SUPABASE_URL" in message
    assert "SUPABASE_SERVICE_ROLE_KEY" in message
    assert ".env.example" in message
    assert "docs/supabase-setup.md" in message


def test_local_storage_requires_a_directory_but_no_supabase_keys():
    with pytest.raises(ConfigError, match="FLOWDESK_STORAGE_DIR"):
        load_settings({"DATABASE_URL": "postgresql://x", "FLOWDESK_STORAGE": "local"})
    settings = load_settings(
        {"DATABASE_URL": "postgresql://x", "FLOWDESK_STORAGE": "LOCAL", "FLOWDESK_STORAGE_DIR": "/d"}
    )
    assert settings.storage_backend == "local"


def test_unknown_storage_backend_is_rejected():
    with pytest.raises(ConfigError, match="FLOWDESK_STORAGE"):
        load_settings({**SUPABASE_ENV, "FLOWDESK_STORAGE": "s3"})


@pytest.mark.parametrize("port", ["eighty", "0", "65536", "-1"])
def test_invalid_ports_are_rejected(port):
    with pytest.raises(ConfigError, match="FLOWDESK_PORT"):
        load_settings({**SUPABASE_ENV, "FLOWDESK_PORT": port})


@pytest.mark.parametrize(
    "url",
    [
        "https://ref.supabase.co",
        "https://ref.supabase.co/",
        "https://ref.supabase.co/rest/v1/",
        "https://ref.supabase.co/rest/v1",
        "https://ref.supabase.co/storage/v1",
        " https://ref.supabase.co/auth/v1/ ",
    ],
)
def test_supabase_api_urls_are_reduced_to_the_project_url(url):
    assert normalize_supabase_url(url) == "https://ref.supabase.co"
    assert load_settings({**SUPABASE_ENV, "SUPABASE_URL": url}).supabase_url == "https://ref.supabase.co"


@pytest.mark.parametrize(
    "url",
    [
        "https://supabase.com/dashboard/project/ref",
        "ref.supabase.co",
        "https://ref.supabase.co/?x=1",
        "ftp://ref.supabase.co",
    ],
)
def test_other_supabase_urls_are_rejected_with_a_hint(url):
    with pytest.raises(ConfigError, match="must be the Project URL"):
        load_settings({**SUPABASE_ENV, "SUPABASE_URL": url})
