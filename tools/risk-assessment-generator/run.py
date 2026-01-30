#!/usr/bin/env python3
"""Simple script to run the Risk Assessment Generator web app."""

import os
import sys
import webbrowser
from pathlib import Path
from threading import Timer


def open_browser():
    """Open the browser after a short delay."""
    webbrowser.open("http://127.0.0.1:5000")


def load_api_key():
    """Load API key from environment or config file."""
    # First check environment variable
    if os.environ.get("ANTHROPIC_API_KEY"):
        return True

    # Then check config file
    key_file = Path.home() / ".anthropic_key"
    if key_file.exists():
        key = key_file.read_text().strip()
        if key:
            os.environ["ANTHROPIC_API_KEY"] = key
            return True

    return False


def main():
    # Check for API key
    if not load_api_key():
        print("=" * 60)
        print("WARNING: ANTHROPIC_API_KEY not set!")
        print("=" * 60)
        print()
        print("To use this tool, you need to set your Anthropic API key.")
        print()
        print("Option 1 - Save to file (recommended, one-time setup):")
        print()
        print("  echo 'your-key-here' > ~/.anthropic_key")
        print()
        print("Option 2 - Set environment variable each time:")
        print()
        print("  export ANTHROPIC_API_KEY='your-key-here'")
        print()
        print("Get your API key at: https://console.anthropic.com/api-keys")
        print("=" * 60)
        sys.exit(1)

    from risk_assessment_generator.web import app

    print()
    print("=" * 60)
    print("Risk Assessment Generator")
    print("=" * 60)
    print()
    print("Starting web server...")
    print("Opening browser to: http://127.0.0.1:5000")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)

    # Open browser after 1.5 seconds
    Timer(1.5, open_browser).start()

    # Run the Flask app
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    main()
