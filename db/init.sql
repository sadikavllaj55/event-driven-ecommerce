-- ============================================
-- Orders (Order Service)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    buyer_id UUID,
    status TEXT NOT NULL,
    total_cents INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_cents INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
);


-- ============================================
-- Stock (Inventory Service)
-- ============================================
CREATE TABLE IF NOT EXISTS stock (
    product_id TEXT PRIMARY KEY,
    available INT NOT NULL
);

INSERT INTO stock (product_id, available) VALUES
    ('prod-123', 10),
    ('prod-456', 3)
ON CONFLICT (product_id) DO NOTHING;

-- ============================================
-- Users (User Service)
-- ============================================
-- Role type: enforce valid roles at the DB level (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'buyer',
    verified BOOLEAN NOT NULL DEFAULT false,
    verification_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================
-- Products (Product Service)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
