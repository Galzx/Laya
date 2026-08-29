-- Enable referential integrity: every subtask must belong to an existing task.
-- SQLite cannot add a foreign key with ALTER TABLE, so we rebuild the table.
-- Clean any orphaned subtasks left behind by earlier manual deletes first.
DELETE FROM subtasks
WHERE task_id NOT IN (SELECT id FROM tasks);

ALTER TABLE subtasks RENAME TO subtasks_old;

CREATE TABLE subtasks (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

INSERT INTO subtasks (id, task_id, title, is_completed, position, created_at)
SELECT id, task_id, title, is_completed, position, created_at FROM subtasks_old;

DROP TABLE subtasks_old;

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks (task_id);
