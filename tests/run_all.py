import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


def _npm() -> str:
    npm = shutil.which("npm")
    if npm is None:
        sys.exit("npm not found: install Node.js 20+ to run the frontend checks.")
    return npm


def build_steps(skip_e2e: bool) -> list[tuple[str, list[str], Path]]:
    python = sys.executable
    npm = _npm()
    steps = [
        ("Backend lint", [python, "-m", "ruff", "check", "backend", "start.py", "tests"], ROOT),
        (
            "Backend formatting",
            [python, "-m", "ruff", "format", "--check", "backend", "start.py", "tests"],
            ROOT,
        ),
        ("Backend tests", [python, "-m", "pytest", "-q"], ROOT),
        ("Frontend lint", [npm, "run", "lint"], FRONTEND),
        ("Frontend type-check and build", [npm, "run", "build"], FRONTEND),
        ("Frontend unit tests", [npm, "test"], FRONTEND),
    ]
    if not skip_e2e:
        steps.append(("End-to-end tests", [npm, "exec", "--", "playwright", "test"], FRONTEND))
    return steps


def main() -> int:
    parser = argparse.ArgumentParser(description="Run every Flowdesk check and test suite.")
    parser.add_argument("--skip-e2e", action="store_true", help="skip the browser end-to-end tests")
    args = parser.parse_args()

    results: list[tuple[str, bool, float]] = []
    for name, command, cwd in build_steps(args.skip_e2e):
        print(f"\n=== {name} ===", flush=True)
        started = time.monotonic()
        ok = subprocess.run(command, cwd=cwd).returncode == 0
        results.append((name, ok, time.monotonic() - started))

    print("\n=== Summary ===")
    for name, ok, seconds in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name} ({seconds:.0f}s)")
    failed = [name for name, ok, _ in results if not ok]
    print("\nAll checks passed." if not failed else f"\n{len(failed)} step(s) failed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
