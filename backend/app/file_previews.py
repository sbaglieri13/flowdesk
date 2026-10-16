from pathlib import PurePath
from typing import Literal, NamedTuple

PreviewKind = Literal["image", "pdf", "text"]


class Preview(NamedTuple):
    kind: PreviewKind
    media_type: str


_TEXT = Preview("text", "text/plain; charset=utf-8")

PREVIEWS: dict[str, Preview] = {
    ".png": Preview("image", "image/png"),
    ".jpg": Preview("image", "image/jpeg"),
    ".jpeg": Preview("image", "image/jpeg"),
    ".gif": Preview("image", "image/gif"),
    ".webp": Preview("image", "image/webp"),
    ".pdf": Preview("pdf", "application/pdf"),
    ".txt": _TEXT,
    ".md": _TEXT,
    ".csv": _TEXT,
    ".json": _TEXT,
    ".log": _TEXT,
}


def preview_for(filename: str) -> Preview | None:
    return PREVIEWS.get(PurePath(filename).suffix.lower())
