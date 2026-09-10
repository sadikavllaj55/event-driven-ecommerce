CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    product_id TEXT NOT NULL,
    quantity INT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock (
    product_id TEXT PRIMARY KEY,
    available INT NOT NULL
);

INSERT INTO stock (product_id, available) VALUES
    ('prod-123', 10),
    ('prod-456', 3)
ON CONFLICT (product_id) DO NOTHING;
