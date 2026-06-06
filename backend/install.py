"""AI Calendar - Safe dependency installer for Python 3.14"""
import subprocess
import sys


def run(cmd):
    print(f"\n>>> {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        print(f"FAILED: {' '.join(cmd)}")
        sys.exit(result.returncode)


def main():
    print("=" * 50)
    print("  AI Calendar - Dependency Installer")
    print(f"  Python {sys.version.split()[0]}")
    print("=" * 50)

    # Step 1: Upgrade pip (critical for Python 3.14)
    run([sys.executable, "-m", "pip", "install", "--upgrade", "pip", "--no-cache-dir"])

    # Step 2: Install pydantic first (triggers pydantic-core wheel)
    print("\n[1/3] Installing pydantic (core dependency)...")
    run([sys.executable, "-m", "pip", "install", "--no-cache-dir", "pydantic", "pydantic-settings"])

    # Step 3: Install remaining packages
    print("\n[2/3] Installing other dependencies...")
    packages = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "python-jose[cryptography]",
        "passlib[bcrypt]",
        "bcrypt<5.0",
        "python-multipart",
        "httpx",
    ]
    run([sys.executable, "-m", "pip", "install", "--no-cache-dir"] + packages)

    # Step 4: Verify
    print("\n[3/3] Verifying installation...")
    modules = ["fastapi", "pydantic", "sqlalchemy", "bcrypt", "jose", "httpx", "uvicorn"]
    failed = []
    for mod in modules:
        try:
            __import__(mod)
            print(f"  OK  {mod}")
        except ImportError:
            print(f"  FAIL  {mod}")
            failed.append(mod)

    if failed:
        print(f"\nFailed to import: {', '.join(failed)}")
        sys.exit(1)

    print("\n" + "=" * 50)
    print("  Installation complete!")
    print("  Run: uvicorn main:app --reload")
    print("=" * 50)


if __name__ == "__main__":
    main()
