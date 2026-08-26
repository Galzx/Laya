-- Optional fields preserve compatibility with previously captured tasks.
ALTER TABLE tasks ADD COLUMN start_date INTEGER;
ALTER TABLE tasks ADD COLUMN next_action TEXT;
ALTER TABLE tasks ADD COLUMN archived_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due_date ON tasks (workspace_id, due_date);
