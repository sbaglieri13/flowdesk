import sys
import threading
import webbrowser

import uvicorn


def _open_browser_soon(url: str) -> None:
    threading.Timer(0.75, lambda: webbrowser.open(url)).start()


def main() -> int:
    try:
        from backend.app.config import STATIC_DIR, settings
        from backend.app.main import app
    except RuntimeError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1

    url = f"http://{settings.host}:{settings.port}"
    if not STATIC_DIR.exists():
        print(
            f"Note: frontend build not found at {STATIC_DIR}. "
            "Run `cd frontend && npm install && npm run build` first."
        )
    else:
        _open_browser_soon(url)

    print(f"Starting Flowdesk at {url}")
    uvicorn.run(app, host=settings.host, port=settings.port)
    return 0


if __name__ == "__main__":
    sys.exit(main())
