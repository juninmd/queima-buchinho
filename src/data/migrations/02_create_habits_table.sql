CREATE TABLE IF NOT EXISTS daily_habits (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  brasilia_date DATE NOT NULL,
  habit_key VARCHAR(50) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brasilia_date, habit_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_habits_lookup
  ON daily_habits (user_id, brasilia_date);
