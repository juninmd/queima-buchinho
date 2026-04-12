-- Table to store various health metrics
CREATE TABLE IF NOT EXISTS user_metrics (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'water', 'weight', 'steps', etc.
    value NUMERIC NOT NULL,
    unit VARCHAR(20), -- 'ml', 'kg', 'steps'
    brasilia_date VARCHAR(10) NOT NULL, -- format YYYY-MM-DD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries for daily metrics
CREATE INDEX IF NOT EXISTS idx_user_metrics_date ON user_metrics (user_id, brasilia_date, type);
