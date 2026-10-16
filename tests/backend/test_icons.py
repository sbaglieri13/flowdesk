import json

from backend.app import config
from backend.app.seed import DEFAULT_COLUMN_ICONS, DEFAULT_PRIORITIES, DEFAULT_TASK_TYPES

CATALOG = {
    item["key"]
    for item in json.loads(
        (config.PROJECT_ROOT / "frontend" / "src" / "icons" / "catalog.json").read_text("utf-8")
    )
}


def test_every_icon_the_backend_can_write_exists_in_the_frontend_catalog():
    used = (
        set(DEFAULT_COLUMN_ICONS.values())
        | {icon for _key, _name, icon, _color in DEFAULT_PRIORITIES + DEFAULT_TASK_TYPES}
        | {"tag", "minus", "clipboard-text"}
    )
    assert used - CATALOG == set()
