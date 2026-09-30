import threading
import webbrowser

import uvicorn

from backend.app import config
from backend.app.main import app

URL = f"http://{config.HOST}:{config.PORT}"


def _open_browser_soon() -> None:
    threading.Timer(0.75, lambda: webbrowser.open(URL)).start()


if __name__ == "__main__":
    if not config.STATIC_DIR.exists():
        print(
            f"Note: frontend build not found at {config.STATIC_DIR}. "
            "Run `cd frontend && npm install && npm run build` first."
        )
    else:
        _open_browser_soon()

    print(f"Starting Flowdesk at {URL} (local only)")
    uvicorn.run(app, host=config.HOST, port=config.PORT)
