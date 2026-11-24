-- Proposed event schema; see verify_funnel.py for a runnable SQLite example.
-- Run on complete windows only. event_at is Unix seconds.
WITH ranked_entries AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY experiment_id, user_id
            ORDER BY event_at, event_id
        ) AS entry_rank
    FROM events
    WHERE event_name = 'eligible_menu_entry'
),
guest_outcomes AS (
    SELECT
        entry.experiment_id,
        entry.variant,
        entry.candidate_sku,
        EXISTS (
            SELECT 1
            FROM events AS cart
            WHERE cart.event_name = 'cart_opened'
                AND cart.user_id = entry.user_id
                AND cart.session_id = entry.session_id
                AND cart.store_id = entry.store_id
                AND cart.event_at BETWEEN entry.event_at AND entry.event_at + 300
                AND cart.valid_cart = 1
        ) AS reached_cart,
        EXISTS (
            SELECT 1
            FROM events AS paid
            WHERE paid.event_name = 'order_paid'
                AND paid.user_id = entry.user_id
                AND paid.session_id = entry.session_id
                AND paid.store_id = entry.store_id
                AND paid.event_at BETWEEN entry.event_at AND entry.event_at + 1800
                AND paid.order_id IS NOT NULL
        ) AS paid_any,
        EXISTS (
            SELECT 1
            FROM events AS paid
            JOIN order_items AS item ON item.order_id = paid.order_id
            WHERE paid.event_name = 'order_paid'
                AND paid.user_id = entry.user_id
                AND paid.session_id = entry.session_id
                AND paid.store_id = entry.store_id
                AND paid.event_at BETWEEN entry.event_at AND entry.event_at + 1800
                AND item.sku = entry.candidate_sku
        ) AS paid_candidate
    FROM ranked_entries AS entry
    WHERE entry.entry_rank = 1
)
SELECT
    experiment_id,
    variant,
    COUNT(*) AS eligible_users,
    SUM(reached_cart) AS users_with_cart_5m,
    SUM(paid_any) AS users_with_payment_30m,
    COUNT(candidate_sku) AS users_with_candidate,
    SUM(paid_candidate) AS users_with_candidate_payment_30m,
    AVG(reached_cart) AS cart_rate_5m,
    AVG(paid_any) AS payment_rate_30m,
    SUM(paid_candidate) * 1.0 / NULLIF(COUNT(candidate_sku), 0) AS candidate_payment_rate_30m
FROM guest_outcomes
GROUP BY experiment_id, variant
ORDER BY experiment_id, variant;
