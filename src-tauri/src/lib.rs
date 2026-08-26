mod db;

use db::{DbPool, SettingItem, Subtask, Task, Workspace};
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
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
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

#[tauri::command]
async fn get_tasks(workspace_id: String, pool: State<'_, DbPool>) -> Result<Vec<Task>, String> {
    sqlx::query_as::<_, Task>(
        "SELECT id, workspace_id, title, description, status, priority, start_date, due_date, next_action, completed_at, archived_at, created_at, updated_at
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
    pool: State<'_, DbPool>,
) -> Result<Task, String> {
    let id = format!("task-{}", Uuid::new_v4());
    let now = current_timestamp();
    let task_priority = priority.unwrap_or_else(|| "medium".to_string());
    let status = if due_date.is_some() { "todo" } else { "inbox" }.to_string();

    sqlx::query(
        "INSERT INTO tasks (id, workspace_id, title, description, status, priority, start_date, due_date, next_action, completed_at, archived_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)"
    )
    .bind(&id)
    .bind(&workspace_id)
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
    // Delete associated subtasks first
    sqlx::query("DELETE FROM subtasks WHERE task_id = ?")
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(&task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
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
    let id = format!("subtask-{}", Uuid::new_v4());
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
    let current = sqlx::query_as::<_, Subtask>("SELECT * FROM subtasks WHERE id = ?")
        .bind(&subtask_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let new_completed = if current.is_completed == 1 { 0 } else { 1 };

    sqlx::query("UPDATE subtasks SET is_completed = ? WHERE id = ?")
        .bind(new_completed)
        .bind(&subtask_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Subtask>("SELECT * FROM subtasks WHERE id = ?")
        .bind(&subtask_id)
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
async fn update_task_due_date(task_id: String, due_date: Option<i64>, pool: State<'_, DbPool>) -> Result<(), String> {
    let now = current_timestamp();
    sqlx::query("UPDATE tasks SET due_date = ?, status = CASE WHEN ? IS NOT NULL AND status = 'inbox' THEN 'todo' ELSE status END, updated_at = ? WHERE id = ?")
        .bind(due_date)
        .bind(due_date)
        .bind(now)
        .bind(task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn clear_completed_tasks(workspace_id: String, pool: State<'_, DbPool>) -> Result<u64, String> {
    sqlx::query(
        "DELETE FROM subtasks
         WHERE task_id IN (SELECT id FROM tasks WHERE workspace_id = ? AND status = 'completed')"
    )
    .bind(&workspace_id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let result = sqlx::query("DELETE FROM tasks WHERE workspace_id = ? AND status = 'completed'")
        .bind(workspace_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected())
}

#[tauri::command]
async fn plan_task_for_today(task_id: String, due_date: i64, pool: State<'_, DbPool>) -> Result<(), String> {
    let now = current_timestamp();
    sqlx::query("UPDATE tasks SET due_date = ?, status = 'todo', completed_at = NULL, archived_at = NULL, updated_at = ? WHERE id = ?")
        .bind(due_date)
        .bind(now)
        .bind(task_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_task_next_action(task_id: String, next_action: Option<String>, pool: State<'_, DbPool>) -> Result<(), String> {
    let now = current_timestamp();
    sqlx::query("UPDATE tasks SET next_action = ?, updated_at = ? WHERE id = ?")
        .bind(next_action)
        .bind(now)
        .bind(task_id)
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
            get_tasks,
            create_task,
            toggle_task_status,
            set_task_status,
            delete_task,
            clear_completed_tasks,
            get_subtasks,
            create_subtask,
            toggle_subtask,
            delete_subtask,
            update_task_due_date,
            plan_task_for_today,
            update_task_next_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
