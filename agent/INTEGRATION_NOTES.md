# Wiring `ps99_supabase_client.py` into `ps99_restock_bot.py`

Four small additions. Nothing else in your bot changes — the automation,
OCR, Discord commands, and GUI all keep working exactly as they do now,
whether or not Supabase is configured (the client no-ops if the env vars
are missing, so this is safe to add even before you've generated a key).

## 1. Import it and add the two env vars

At the top of `ps99_restock_bot.py`:

```python
import ps99_supabase_client as supa
```

Add to your `.env` (the onboarding screen on the dashboard gives you
these two values):

```
SUPABASE_FUNCTIONS_URL=https://your-project-ref.functions.supabase.co
SUPABASE_AGENT_KEY=the-key-shown-once-during-onboarding
```

## 2. Report status wherever `bot_status` already gets read

The cleanest spot is right inside the GUI's existing `refresh()` function
(or once a second from any background thread) — reuse the same fields
it already reads:

```python
def refresh():
    with bot_status.lock:
        connected = bot_status.connected
        bot_user = bot_status.bot_user
        booth_full = bot_status.booth_full
        booth_last_read = bot_status.booth_last_read
        last_event = bot_status.last_event

    with queue_lock:
        qlen = len(restock_queue)

    new_markup = supa.report_status(
        connected=connected,
        bot_user=bot_user,
        booth_full=booth_full,
        booth_last_read=booth_last_read,
        last_event=last_event,
        queue_length=qlen,
    )

    # If the dashboard changed the markup since we last checked,
    # apply it locally too.
    if new_markup is not None and new_markup != get_markup_percent():
        set_markup_percent(new_markup)

    # ...rest of refresh() unchanged...
```

## 3. Report each successful restock

Inside `restock_worker()`, right after a successful `restock_item(...)`
call (where `set_last_event(...)` already runs):

```python
if success:
    # ...existing set_last_event(...) and send_discord(...) calls...

    supa.report_status(
        connected=True,
        bot_user=bot_status.bot_user,
        booth_full=bot_status.booth_full,
        booth_last_read=bot_status.booth_last_read,
        last_event=bot_status.last_event,
        queue_length=len(restock_queue),
        restock_event={
            "item_name": job["item"],
            "price": job["price"],
            "rap": job.get("rap", 0),
            "price_basis": job.get("price_basis"),
        },
    )
```

## 4. Poll for dashboard commands

Add one more background thread in `main()`, alongside the existing
worker threads:

```python
def supabase_command_worker():
    while not stop_event.is_set():
        for command in supa.poll_commands():
            kind = command.get("type")
            payload = command.get("payload") or {}

            if kind == "pause":
                stop_event.set()
                set_last_event("Paused from dashboard")
            elif kind == "resume":
                stop_event.clear()
                set_last_event("Resumed from dashboard")
            elif kind == "set_markup":
                percent = payload.get("percent")
                if percent is not None:
                    set_markup_percent(percent)
                    set_last_event(f"Markup changed to +{percent:g}% (via dashboard)")

        stop_event.wait(5)


threading.Thread(target=supabase_command_worker, daemon=True).start()
```

Note: this reuses your existing `stop_event`, so a "pause" from the
dashboard behaves exactly like `/stop` from Discord — it stops the
restock worker but doesn't kill the whole process. If you want pause
to be resumable (rather than requiring a full restart like `/stop`
currently does), that's what the `resume` branch above is for; just
make sure nothing else treats `stop_event` as "shut down for good"
elsewhere in the script.

That's the whole integration — four additions, zero changes to your
existing automation, pricing, or OCR logic.
