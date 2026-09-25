# ps99_supabase_client.py
#
# Drop this file next to ps99_restock_bot.py. It's the "phone home"
# layer: everything it does is send your bot's status to your hosted
# dashboard and pull back any commands (pause/resume/markup change)
# the dashboard queued for it. It never touches Roblox, Discord, or
# PS99 itself — the existing bot code is unchanged aside from a few
# call-outs into this module (see INTEGRATION_NOTES.md).
#
# Requires: pip install requests   (you already have this)

import os
import threading
import requests

SUPABASE_FUNCTIONS_URL = os.getenv("SUPABASE_FUNCTIONS_URL", "")
SUPABASE_AGENT_KEY = os.getenv("SUPABASE_AGENT_KEY", "")

_report_lock = threading.Lock()


def is_configured() -> bool:
    return bool(SUPABASE_FUNCTIONS_URL and SUPABASE_AGENT_KEY)


def report_status(
    connected: bool,
    bot_user: str,
    booth_full: bool,
    booth_last_read: str,
    last_event: str,
    queue_length: int,
    restock_event: dict | None = None,
) -> float | None:
    """
    Push current status to the dashboard. Call this anywhere you
    already update bot_status locally — e.g. right after on_ready(),
    inside the GUI's refresh loop, and after a restock completes.

    restock_event, if given, is a dict like:
        {"item_name": "Huge Cat", "price": 1234567,
         "rap": 900000, "price_basis": "RAP"}

    Returns the markup_percent stored on the server (so you can pick
    up a change made from the dashboard), or None on failure — never
    raises, so a network hiccup can't crash the bot.
    """

    if not is_configured():
        return None

    body = {
        "connected": connected,
        "bot_user": bot_user,
        "booth_full": booth_full,
        "booth_last_read": booth_last_read,
        "last_event": last_event,
        "queue_length": queue_length,
    }

    if restock_event:
        body["restock_event"] = restock_event

    try:
        with _report_lock:
            response = requests.post(
                f"{SUPABASE_FUNCTIONS_URL}/agent-report",
                headers={"x-agent-key": SUPABASE_AGENT_KEY},
                json=body,
                timeout=10,
            )

        if response.status_code != 200:
            print("[SUPABASE] Report failed:", response.status_code, response.text)
            return None

        return response.json().get("markup_percent")

    except Exception as e:
        print("[SUPABASE] Report error:", e)
        return None


def poll_commands() -> list[dict]:
    """
    Pull any pending commands queued from the dashboard. Each item
    looks like {"id": "...", "type": "pause" | "resume" | "set_markup",
    "payload": {...} or None}. Commands are marked delivered server-side
    the moment this returns them, so call this on a timer (e.g. every
    5-10s from a background thread) and apply whatever comes back.
    """

    if not is_configured():
        return []

    try:
        response = requests.get(
            f"{SUPABASE_FUNCTIONS_URL}/agent-commands",
            headers={"x-agent-key": SUPABASE_AGENT_KEY},
            timeout=10,
        )

        if response.status_code != 200:
            print("[SUPABASE] Poll failed:", response.status_code, response.text)
            return []

        return response.json().get("commands", [])

    except Exception as e:
        print("[SUPABASE] Poll error:", e)
        return []
