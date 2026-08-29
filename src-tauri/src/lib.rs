mod db;

use db::{DbPool, Note, Project, SettingItem, Subtask, Task, Workspace};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager, State};
use uuid::Uuid;

#[derive(Serialize)]
pub struct AppSystemStatus {
    pub status: String,
    pub engine: String,
    pub timestamp: u64,
    pub offline_ready: bool,
    pub db_connected: bool,
}

fn current_timestamp() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs() as i64,
        Err(err) => {
            eprintln!("System clock is before Unix epoch; using fallback timestamp: {err}");
            0
        }
    }
}

fn validate_priority(priority: &str) -> Result<&str, String> {
    const VALID: [&str; 4] = ["low", "medium", "high", "urgent"];
    if VALID.contains(&priority) {
        Ok(priority)
    } else {
        Err(format!(
            "Invalid priority '{priority}'. Expected one of: {}.",
            VALID.join(", ")
        ))
    }
}

fn validate_title(title: &str) -> Result<(), String> {
    if title.trim().is_empty() {
        Err("Title cannot be empty.".to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn check_system_status(pool: State<'_, DbPool>) -> AppSystemStatus {
    AppSystemStatus {
        status: "Healthy".to_string(),
        engine: "Tauri 2 + Rust Core Engine".to_string(),
        timestamp: current_timestamp() as u64,
        offline_ready: true,
        db_connected: !pool.is_closed(),
    }
}

#[tauri::command]
async fn get_workspaces(pool: State<'_, DbPool>) -> Result<Vec<Workspace>, String> {
    sqlx::query_as::<_, Workspace>(
        "SELECT id, name, description, is_active, created_at, updated_at FROM workspaces ORDER BY created_at ASC"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_settings(pool: State<'_, DbPool>) -> Result<Vec<SettingItem>, String> {
    sqlx::query_as::<_, SettingItem>("SELECT key, value, updated_at FROM settings")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_setting(key: String, value: String, pool: State<'_, DbPool>) -> Result<(), String> {
    let now = current_timestamp();
    sqlx::query(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    )
    .bind(key)
    .bind(value)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn get_projects(workspace_id: String, pool: State<'_, DbPool>) -> Result<Vec<Project>, String> {
    sqlx::query_as::<_, Project>(
        "SELECT id, workspace_id, name, description, color, cover_image, status, due_date, created_at, updated_at
         FROM projects
         WHERE workspace_id = ?
         ORDER BY 
           CASE status
             WHEN 'active' THEN 1
             WHEN 'completed' THEN 2
             ELSE 3
           END,
           created_at DESC"
    )
    .bind(workspace_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_project(
    workspace_id: String,
    name: String,
    description: Option<String>,
    color: Option<String>,
    cover_image: Option<String>,
    due_date: Option<i64>,
    pool: State<'_, DbPool>,
) -> Result<Project, String> {
    validate_title(&name)?;
    let id = format!("proj-{}", Uuid::new_v4());
    let now = current_timestamp();
    let project_color = color.unwrap_or_else(|| "amber".to_string());
    let status = "active".to_string();

    sqlx::query(
        "INSERT INTO projects (id, workspace_id, name, description, color, cover_image, status, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&project_color)
    .bind(&cover_image)
    .bind(&status)
    .bind(due_date)
    .bind(now)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        workspace_id,
        name,
        description,
        color: project_color,
        cover_image,
        status,
        due_date,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
async fn update_project(
    project_id: String,
    name: Option<String>,
    description: Option<String>,
    color: Option<String>,
    cover_image: Option<String>,
    status: Option<String>,
    due_date: Option<i64>,
    pool: State<'_, DbPool>,
) -> Result<Project, String> {
    let now = current_timestamp();

    let mut current = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(&project_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(n) = name {
        validate_title(&n)?;
        current.name = n;
    }
    if let Some(c) = color {
        current.color = c;
    }
    if cover_image.is_some() {
        current.cover_image = cover_image;
    }
    if let Some(s) = status {
        current.status = s;
    }
    if description.is_some() {
        current.description = description;
    }
    current.due_date = due_date;

    sqlx::query(
        "UPDATE projects SET name = ?, description = ?, color = ?, cover_image = ?, status = ?, due_date = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&current.name)
    .bind(&current.description)
    .bind(&current.color)
    .bind(&current.cover_image)
    .bind(&current.status)
    .bind(current.due_date)
    .bind(now)
    .bind(&project_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_project(project_id: String, pool: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(project_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn assign_task_to_project(task_id: String, project_id: Option<String>, pool: State<'_, DbPool>) -> Result<Task, String> {
    let now = current_timestamp();
    sqlx::query("UPDATE tasks SET project_id = ?, updated_at = ? WHERE id = ?")
        .bind(&project_id)
        .bind(now)
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

// ─── TASKS ────────────────────────────────────────────────────────────────

#[tauri::command]
async fn get_tasks(workspace_id: String, pool: State<'_, DbPool>) -> Result<Vec<Task>, String> {
    sqlx::query_as::<_, Task>(
        "SELECT id, workspace_id, project_id, title, description, status, priority, start_date, due_date, next_action, completed_at, archived_at, created_at, updated_at
         FROM tasks 
         WHERE workspace_id = ? 
         ORDER BY 
           CASE status 
             WHEN 'in_progress' THEN 1
             WHEN 'todo' THEN 2
             WHEN 'inbox' THEN 3
             WHEN 'completed' THEN 4
             ELSE 5
           END, 
           created_at DESC"
    )
    .bind(workspace_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_task(
    workspace_id: String,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    start_date: Option<i64>,
    due_date: Option<i64>,
    next_action: Option<String>,
    project_id: Option<String>,
    pool: State<'_, DbPool>,
) -> Result<Task, String> {
    validate_title(&title)?;
    let task_priority = match priority.as_deref() {
        Some(value) => validate_priority(value)?.to_string(),
        None => "medium".to_string(),
    };
    let id = format!("task-{}", Uuid::new_v4());
    let now = current_timestamp();
    let status = if due_date.is_some() { "todo" } else { "inbox" }.to_string();

    sqlx::query(
        "INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, start_date, due_date, next_action, completed_at, archived_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)"
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&project_id)
    .bind(&title)
    .bind(&description)
    .bind(&status)
    .bind(&task_priority)
    .bind(start_date)
    .bind(due_date)
    .bind(&next_action)
    .bind(now)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        workspace_id,
        project_id,
        title,
        description,
        status,
        priority: task_priority,
        start_date,
        due_date,
        next_action,
        completed_at: None,
        archived_at: None,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
async fn toggle_task_status(task_id: String, pool: State<'_, DbPool>) -> Result<Task, String> {
    let now = current_timestamp();

    let current_task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let new_status = if current_task.status == "completed" {
        if current_task.due_date.is_some() { "todo" } else { "inbox" }
    } else {
        "completed"
    };

    let completed_at = if new_status == "completed" {
        Some(now)
    } else {
        None
    };

    sqlx::query("UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?")
        .bind(new_status)
        .bind(completed_at)
        .bind(now)
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_task_status(task_id: String, status: String, pool: State<'_, DbPool>) -> Result<Task, String> {
    let valid_statuses = ["inbox", "todo", "in_progress", "completed", "archived"];
    if !valid_statuses.contains(&status.as_str()) {
        return Err("Invalid task status.".to_string());
    }

    let now = current_timestamp();
    let completed_at = if status == "completed" { Some(now) } else { None };
    let archived_at = if status == "archived" { Some(now) } else { None };

    sqlx::query(
        "UPDATE tasks
         SET status = ?,
             completed_at = ?,
             archived_at = ?,
             due_date = CASE WHEN ? = 'inbox' THEN NULL ELSE due_date END,
             updated_at = ?
         WHERE id = ?"
    )
    .bind(&status)
    .bind(completed_at)
    .bind(archived_at)
    .bind(&status)
    .bind(now)
    .bind(&task_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_task(task_id: String, pool: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn restore_task(task_id: String, pool: State<'_, DbPool>) -> Result<Task, String> {
    let now = current_timestamp();
    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let new_status = if task.due_date.is_some() { "todo" } else { "inbox" };

    sqlx::query(
        "UPDATE tasks SET status = ?, completed_at = NULL, archived_at = NULL, updated_at = ? WHERE id = ?"
    )
    .bind(new_status)
    .bind(now)
    .bind(&task_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_completed_tasks(workspace_id: String, pool: State<'_, DbPool>) -> Result<u64, String> {
    let now = current_timestamp();
    let result = sqlx::query(
        "UPDATE tasks 
         SET status = 'archived', archived_at = ?, updated_at = ? 
         WHERE workspace_id = ? AND status = 'completed'"
    )
    .bind(now)
    .bind(now)
    .bind(workspace_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.rows_affected())
}

#[tauri::command]
async fn clear_project_completed_tasks(project_id: String, pool: State<'_, DbPool>) -> Result<u64, String> {
    let now = current_timestamp();
    let result = sqlx::query(
        "UPDATE tasks 
         SET status = 'archived', archived_at = ?, updated_at = ? 
         WHERE project_id = ? AND status = 'completed'"
    )
    .bind(now)
    .bind(now)
    .bind(project_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.rows_affected())
}

#[tauri::command]
async fn clear_archived_tasks(workspace_id: String, pool: State<'_, DbPool>) -> Result<u64, String> {
    let _ = sqlx::query(
        "DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE workspace_id = ? AND status = 'archived')"
    )
    .bind(&workspace_id)
    .execute(&*pool)
    .await;

    let result = sqlx::query("DELETE FROM tasks WHERE workspace_id = ? AND status = 'archived'")
        .bind(workspace_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected())
}

#[tauri::command]
async fn get_subtasks(task_id: String, pool: State<'_, DbPool>) -> Result<Vec<Subtask>, String> {
    sqlx::query_as::<_, Subtask>(
        "SELECT id, task_id, title, is_completed, position, created_at FROM subtasks WHERE task_id = ? ORDER BY position ASC, created_at ASC"
    )
    .bind(task_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_subtask(task_id: String, title: String, pool: State<'_, DbPool>) -> Result<Subtask, String> {
    validate_title(&title)?;
    let id = format!("sub-{}", Uuid::new_v4());
    let now = current_timestamp();

    sqlx::query(
        "INSERT INTO subtasks (id, task_id, title, is_completed, position, created_at) VALUES (?, ?, ?, 0, 0, ?)"
    )
    .bind(&id)
    .bind(&task_id)
    .bind(&title)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Subtask {
        id,
        task_id,
        title,
        is_completed: 0,
        position: 0,
        created_at: now,
    })
}

#[tauri::command]
async fn toggle_subtask(subtask_id: String, pool: State<'_, DbPool>) -> Result<Subtask, String> {
    sqlx::query(
        "UPDATE subtasks SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END WHERE id = ?"
    )
    .bind(&subtask_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Subtask>("SELECT * FROM subtasks WHERE id = ?")
        .bind(subtask_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_subtask(subtask_id: String, pool: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM subtasks WHERE id = ?")
        .bind(subtask_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_task_due_date(
    task_id: String,
    due_date: Option<i64>,
    pool: State<'_, DbPool>,
) -> Result<Task, String> {
    let now = current_timestamp();

    let current = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let status = if due_date.is_some() && current.status == "inbox" {
        "todo".to_string()
    } else {
        current.status
    };

    sqlx::query("UPDATE tasks SET due_date = ?, status = ?, updated_at = ? WHERE id = ?")
        .bind(due_date)
        .bind(&status)
        .bind(now)
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn plan_task_for_today(
    task_id: String,
    due_date: Option<i64>,
    pool: State<'_, DbPool>,
) -> Result<Task, String> {
    let now = current_timestamp();
    let target_due = due_date.unwrap_or(now);
    sqlx::query("UPDATE tasks SET due_date = ?, status = 'todo', updated_at = ? WHERE id = ?")
        .bind(target_due)
        .bind(now)
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task_next_action(
    task_id: String,
    next_action: Option<String>,
    pool: State<'_, DbPool>,
) -> Result<Task, String> {
    let now = current_timestamp();
    sqlx::query("UPDATE tasks SET next_action = ?, updated_at = ? WHERE id = ?")
        .bind(&next_action)
        .bind(now)
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task_priority(
    task_id: String,
    priority: String,
    pool: State<'_, DbPool>,
) -> Result<Task, String> {
    let validated = validate_priority(&priority)?;
    let now = current_timestamp();
    sqlx::query("UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?")
        .bind(validated)
        .bind(now)
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task(
    task_id: String,
    title: Option<String>,
    description: Option<String>,
    priority: Option<String>,
    due_date: Option<i64>,
    next_action: Option<String>,
    project_id: Option<String>,
    pool: State<'_, DbPool>,
) -> Result<Task, String> {
    let now = current_timestamp();

    let mut current = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(t) = title {
        validate_title(&t)?;
        current.title = t;
    }
    if let Some(p) = priority {
        current.priority = validate_priority(&p)?.to_string();
    }
    if description.is_some() {
        current.description = description;
    }
    current.due_date = due_date;
    current.next_action = next_action;
    current.project_id = project_id;

    let status = if current.due_date.is_some() && current.status == "inbox" {
        "todo".to_string()
    } else {
        current.status
    };

    sqlx::query(
        "UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, next_action = ?, project_id = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&current.title)
    .bind(&current.description)
    .bind(&status)
    .bind(&current.priority)
    .bind(current.due_date)
    .bind(&current.next_action)
    .bind(&current.project_id)
    .bind(now)
    .bind(&task_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_notes(workspace_id: String, pool: State<'_, DbPool>) -> Result<Vec<Note>, String> {
    sqlx::query_as::<_, Note>(
        "SELECT * FROM notes WHERE workspace_id = ? ORDER BY is_pinned DESC, updated_at DESC"
    )
    .bind(workspace_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_note(
    workspace_id: String,
    project_id: Option<String>,
    title: String,
    content: Option<String>,
    color: Option<String>,
    pool: State<'_, DbPool>,
) -> Result<Note, String> {
    let id = format!("note-{}", Uuid::new_v4());
    let now = current_timestamp();
    let safe_title = if title.trim().is_empty() {
        "Untitled Note".to_string()
    } else {
        title
    };
    let safe_content = content.unwrap_or_default();
    let safe_color = color.unwrap_or_else(|| "amber".to_string());

    sqlx::query(
        "INSERT INTO notes (id, workspace_id, project_id, title, content, is_pinned, is_archived, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&project_id)
    .bind(&safe_title)
    .bind(&safe_content)
    .bind(&safe_color)
    .bind(now)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_note(
    note_id: String,
    title: Option<String>,
    content: Option<String>,
    project_id: Option<String>,
    is_pinned: Option<bool>,
    color: Option<String>,
    pool: State<'_, DbPool>,
) -> Result<Note, String> {
    let now = current_timestamp();

    let mut current = sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE id = ?")
        .bind(&note_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(t) = title {
        current.title = if t.trim().is_empty() { "Untitled Note".to_string() } else { t };
    }
    if let Some(c) = content {
        current.content = c;
    }
    if project_id.is_some() {
        current.project_id = project_id;
    }
    if let Some(p) = is_pinned {
        current.is_pinned = if p { 1 } else { 0 };
    }
    if let Some(col) = color {
        current.color = col;
    }

    sqlx::query(
        "UPDATE notes SET title = ?, content = ?, project_id = ?, is_pinned = ?, color = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&current.title)
    .bind(&current.content)
    .bind(&current.project_id)
    .bind(current.is_pinned)
    .bind(&current.color)
    .bind(now)
    .bind(&note_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE id = ?")
        .bind(note_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_note_pinned(note_id: String, pool: State<'_, DbPool>) -> Result<Note, String> {
    let now = current_timestamp();
    sqlx::query(
        "UPDATE notes SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?"
    )
    .bind(now)
    .bind(&note_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE id = ?")
        .bind(note_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn archive_note(note_id: String, pool: State<'_, DbPool>) -> Result<Note, String> {
    let now = current_timestamp();
    sqlx::query("UPDATE notes SET is_archived = 1, updated_at = ? WHERE id = ?")
        .bind(now)
        .bind(&note_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE id = ?")
        .bind(note_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn restore_note(note_id: String, pool: State<'_, DbPool>) -> Result<Note, String> {
    let now = current_timestamp();
    sqlx::query("UPDATE notes SET is_archived = 0, updated_at = ? WHERE id = ?")
        .bind(now)
        .bind(&note_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE id = ?")
        .bind(note_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_note(note_id: String, pool: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM notes WHERE id = ?")
        .bind(&note_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to resolve app data directory");

            let pool = tauri::async_runtime::block_on(async {
                db::init_db(app_data_dir).await
            }).expect("failed to initialize SQLite database");

            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_system_status,
            get_workspaces,
            get_settings,
            update_setting,
            get_projects,
            create_project,
            update_project,
            delete_project,
            assign_task_to_project,
            get_tasks,
            create_task,
            toggle_task_status,
            set_task_status,
            delete_task,
            restore_task,
            clear_completed_tasks,
            clear_project_completed_tasks,
            clear_archived_tasks,
            get_subtasks,
            create_subtask,
            toggle_subtask,
            delete_subtask,
            update_task_due_date,
            plan_task_for_today,
            update_task_next_action,
            update_task_priority,
            update_task,
            get_notes,
            create_note,
            update_note,
            toggle_note_pinned,
            archive_note,
            restore_note,
            delete_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
