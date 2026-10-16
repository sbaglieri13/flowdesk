from urllib.parse import quote


def content_disposition(disposition: str, filename: str) -> str:
    ascii_name = filename.encode("ascii", "ignore").decode().replace('"', "").replace("\\", "") or "file"
    return f"{disposition}; filename=\"{ascii_name}\"; filename*=utf-8''{quote(filename)}"
