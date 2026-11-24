"""Exercise the proposed query on made-up events. Requires only Python."""

import sqlite3
from pathlib import Path

with sqlite3.connect(":memory:") as db:
    db.executescript("""
        CREATE TABLE events (
            event_id INTEGER PRIMARY KEY,
            event_name TEXT NOT NULL,
            user_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            store_id TEXT NOT NULL,
            event_at INTEGER NOT NULL,
            experiment_id TEXT,
            variant TEXT,
            candidate_sku TEXT,
            valid_cart INTEGER,
            order_id TEXT
        );
        CREATE TABLE order_items (
            order_id TEXT,
            sku TEXT,
            PRIMARY KEY (order_id, sku)
        );
    """)

    events = [
        # Guest one buys the candidate organically while assigned to control.
        ("eligible_menu_entry", "one", "s1", "a", 100, "swap", "A", "bbq", None, None),
        ("cart_opened", "one", "s1", "a", 400, None, None, None, 1, None),
        ("order_paid", "one", "s1", "a", 1900, None, None, None, None, "o1"),
        ("order_paid", "one", "s1", "a", 1900, None, None, None, None, "o1"),
        # Guest two remains in the denominator despite leaving without action.
        ("eligible_menu_entry", "two", "s2", "a", 100, "swap", "A", "bbq", None, None),
        # Guest three's first cart is invalid. The next valid one is a second late.
        ("eligible_menu_entry", "three", "s3", "a", 100, "swap", "B", "bbq", None, None),
        ("cart_opened", "three", "s3", "a", 101, None, None, None, 0, None),
        ("cart_opened", "three", "s3", "a", 401, None, None, None, 1, None),
        ("order_paid", "three", "s3", "a", 1901, None, None, None, None, "late"),
        # Guest four's follow-up session and payment at a different store are excluded.
        ("eligible_menu_entry", "four", "s4", "a", 100, "swap", "B", "bbq", None, None),
        ("order_paid", "four", "s4", "b", 300, None, None, None, None, "wrong_store"),
        ("eligible_menu_entry", "four", "s5", "a", 500, "swap", "B", "bbq", None, None),
        ("order_paid", "four", "s5", "a", 600, None, None, None, None, "wrong_session"),
        # Guest five pays for a different dish. It counts only in the payment guardrail.
        ("eligible_menu_entry", "five", "s6", "a", 100, "swap", "B", "bbq", None, None),
        ("cart_opened", "five", "s6", "a", 200, None, None, None, 1, None),
        ("order_paid", "five", "s6", "a", 300, None, None, None, None, "o5"),
        # Opening a partial cart is not a successful recovery.
        ("eligible_recovery_entry", "six", "s7", "a", 100, "recovery", "A", None, None, None),
        ("cart_opened", "six", "s7", "a", 120, None, None, None, 1, None),
        ("eligible_recovery_entry", "seven", "s8", "a", 100, "recovery", "B", None, None, None),
        ("cart_recovered", "seven", "s8", "a", 120, None, None, None, 1, None),
    ]
    db.executemany("INSERT INTO events VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", events)
    db.executemany("INSERT INTO order_items VALUES (?, ?)", [
        ("o1", "bbq"), ("late", "bbq"), ("wrong_store", "bbq"),
        ("wrong_session", "bbq"), ("o5", "classic"),
    ])

    query = Path(__file__).with_name("funnel.sql").read_text()
    rows = db.execute(query).fetchall()
    assert rows == [
        ("recovery", "A", 1, 0, 0, 0, 0, 0.0, 0.0, None),
        ("recovery", "B", 1, 1, 0, 0, 0, 1.0, 0.0, None),
        ("swap", "A", 2, 1, 1, 2, 1, .5, .5, .5),
        ("swap", "B", 3, 1, 1, 3, 0, 1 / 3, 1 / 3, 0.0),
    ], rows
    print("Synthetic fixture passed: windows, first entry, distinct guest outcomes, store and session attribution, partial and recovered carts.")
