mod db;

use db::{
    AppDataPath, BackupFileInfo, DashboardAggregates, DatabaseStats, DbPool, FullWorkspaceExport,
    Note, Project, SettingItem, Subtask, Task, TaskWithSubtasks, Workspace,
};
use serde::{Deserialize, Serialize};
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
async fn set_active_workspace(workspace_id: String, pool: State<'_, DbPool>) -> Result<Workspace, String> {
    sqlx::query("UPDATE workspaces SET is_active = 0")
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("UPDATE workspaces SET is_active = 1, updated_at = ? WHERE id = ?")
        .bind(current_timestamp())
        .bind(&workspace_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Workspace>("SELECT id, name, description, is_active, created_at, updated_at FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_workspace(
    name: String,
    description: Option<String>,
    pool: State<'_, DbPool>,
) -> Result<Workspace, String> {
    validate_title(&name)?;
    let id = format!("ws-{}", Uuid::new_v4());
    let now = current_timestamp();

    sqlx::query(
        "INSERT INTO workspaces (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&description)
    .bind(now)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Workspace {
        id,
        name,
        description,
        is_active: 0,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
async fn get_dashboard_aggregates(
    workspace_id: String,
    pool: State<'_, DbPool>,
) -> Result<DashboardAggregates, String> {
    let (start_of_day, end_of_day): (i64, i64) = sqlx::query_as(
        "SELECT CAST(strftime('%s', 'now', 'start of day') AS INTEGER), CAST(strftime('%s', 'now', 'start of day', '+1 day', '-1 second') AS INTEGER)"
    )
    .fetch_one(&*pool)
    .await
    .unwrap_or_else(|_| {
        let now = current_timestamp();
        let sod = now - (now % 86400);
        (sod, sod + 86399)
    });

    let (total_tasks,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND status != 'archived'"
    )
    .bind(&workspace_id)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0,));

    let (active_tasks,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND status NOT IN ('completed', 'archived')"
    )
    .bind(&workspace_id)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0,));

    let (completed_today,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND status = 'completed' AND completed_at >= ?"
    )
    .bind(&workspace_id)
    .bind(start_of_day)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0,));

    let (overdue_tasks,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND status NOT IN ('completed', 'archived') AND due_date IS NOT NULL AND due_date < ?"
    )
    .bind(&workspace_id)
    .bind(start_of_day)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0,));

    // Cross-table SQL Join: subtasks for all active tasks
    let (total_subtasks, completed_subtasks): (i64, i64) = sqlx::query_as(
        "SELECT 
            COUNT(s.id), 
            COALESCE(SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END), 0)
         FROM subtasks s
         JOIN tasks t ON s.task_id = t.id
         WHERE t.workspace_id = ? AND t.status != 'archived'"
    )
    .bind(&workspace_id)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0, 0));

    // Cross-table SQL Join: subtasks for today's active tasks (due today or in progress)
    let (today_subtasks_total, today_subtasks_completed): (i64, i64) = sqlx::query_as(
        "SELECT 
            COUNT(s.id), 
            COALESCE(SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END), 0)
         FROM subtasks s
         JOIN tasks t ON s.task_id = t.id
         WHERE t.workspace_id = ? 
           AND t.status != 'archived'
           AND ((t.due_date >= ? AND t.due_date <= ?) OR t.status = 'in_progress')"
    )
    .bind(&workspace_id)
    .bind(start_of_day)
    .bind(end_of_day)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0, 0));

    let subtask_completion_ratio = if today_subtasks_total > 0 {
        today_subtasks_completed as f64 / today_subtasks_total as f64
    } else if total_subtasks > 0 {
        completed_subtasks as f64 / total_subtasks as f64
    } else {
        0.0
    };

    let (active_projects,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM projects WHERE workspace_id = ? AND status = 'active'"
    )
    .bind(&workspace_id)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0,));

    let (total_notes,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM notes WHERE workspace_id = ? AND is_archived = 0"
    )
    .bind(&workspace_id)
    .fetch_one(&*pool)
    .await
    .unwrap_or((0,));

    Ok(DashboardAggregates {
        total_tasks,
        active_tasks,
        completed_today,
        overdue_tasks,
        total_subtasks,
        completed_subtasks,
        today_subtasks_total,
        today_subtasks_completed,
        subtask_completion_ratio,
        active_projects,
        total_notes,
    })
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
        "SELECT id, workspace_id, project_id, title, description, status, priority, start_date, due_date, next_action, completed_at, archived_at, created_at, updated_at, position
         FROM tasks 
         WHERE workspace_id = ? 
         ORDER BY 
           CASE status 
             WHEN 'in_progress' THEN 1
             WHEN 'todo' THEN 2
             WHEN 'planned' THEN 2
             WHEN 'inbox' THEN 3
             WHEN 'completed' THEN 4
             ELSE 5
           END, 
           COALESCE(position, 0) ASC,
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
        "INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, start_date, due_date, next_action, completed_at, archived_at, created_at, updated_at, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 0)"
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
        position: Some(0),
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
    let normalized = match status.as_str() {
        "inbox" => "inbox",
        "todo" | "planned" => "todo",
        "in_progress" => "in_progress",
        "waiting" => "waiting",
        "completed" => "completed",
        "archived" => "archived",
        _ => return Err("Invalid task status.".to_string()),
    };

    let now = current_timestamp();
    let completed_at = if normalized == "completed" { Some(now) } else { None };
    let archived_at = if normalized == "archived" { Some(now) } else { None };

    sqlx::query(
        "UPDATE tasks
         SET status = ?,
             completed_at = ?,
             archived_at = ?,
             due_date = CASE 
               WHEN ? = 'inbox' THEN NULL 
               WHEN (? = 'todo' OR ? = 'in_progress') AND due_date IS NULL THEN ? 
               ELSE due_date 
             END,
             updated_at = ?
         WHERE id = ?"
    )
    .bind(normalized)
    .bind(completed_at)
    .bind(archived_at)
    .bind(normalized)
    .bind(normalized)
    .bind(normalized)
    .bind(now)
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

#[derive(Debug, Deserialize)]
pub struct TaskReorderItem {
    pub id: String,
    pub position: i64,
    pub status: Option<String>,
}

#[tauri::command]
async fn reorder_kanban_tasks(
    items: Vec<TaskReorderItem>,
    pool: State<'_, DbPool>,
) -> Result<(), String> {
    let now = current_timestamp();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    for item in items {
        if let Some(status) = item.status {
            let normalized = match status.as_str() {
                "inbox" => "inbox",
                "todo" | "planned" => "todo",
                "in_progress" => "in_progress",
                "waiting" => "waiting",
                "completed" => "completed",
                "archived" => "archived",
                _ => "todo",
            };
            let completed_at = if normalized == "completed" { Some(now) } else { None };
            let archived_at = if normalized == "archived" { Some(now) } else { None };

            sqlx::query(
                "UPDATE tasks
                 SET position = ?,
                     status = ?,
                     completed_at = ?,
                     archived_at = ?,
                     due_date = CASE 
                       WHEN ? = 'inbox' THEN NULL 
                       WHEN (? = 'todo' OR ? = 'in_progress') AND due_date IS NULL THEN ? 
                       ELSE due_date 
                     END,
                     updated_at = ?
                 WHERE id = ?"
            )
            .bind(item.position)
            .bind(normalized)
            .bind(completed_at)
            .bind(archived_at)
            .bind(normalized)
            .bind(normalized)
            .bind(normalized)
            .bind(now)
            .bind(now)
            .bind(&item.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            sqlx::query(
                "UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?"
            )
            .bind(item.position)
            .bind(now)
            .bind(&item.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
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

// ─── DATA BACKUP, EXPORT & RESTORE ───────────────────────────────────────

#[tauri::command]
async fn get_database_stats(
    pool: State<'_, DbPool>,
    app_dir: State<'_, AppDataPath>,
) -> Result<DatabaseStats, String> {
    let db_path = app_dir.path().join("laya.sqlite");
    let file_size_bytes = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
    let file_path = db_path.to_string_lossy().to_string();

    let (tasks_count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tasks")
        .fetch_one(&*pool)
        .await
        .unwrap_or((0,));
    let (subtasks_count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM subtasks")
        .fetch_one(&*pool)
        .await
        .unwrap_or((0,));
    let (projects_count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM projects")
        .fetch_one(&*pool)
        .await
        .unwrap_or((0,));
    let (notes_count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM notes")
        .fetch_one(&*pool)
        .await
        .unwrap_or((0,));
    let (workspaces_count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM workspaces")
        .fetch_one(&*pool)
        .await
        .unwrap_or((0,));

    Ok(DatabaseStats {
        file_path,
        file_size_bytes,
        workspaces_count,
        tasks_count,
        subtasks_count,
        projects_count,
        notes_count,
    })
}

#[tauri::command]
async fn create_database_backup(
    pool: State<'_, DbPool>,
    app_dir: State<'_, AppDataPath>,
) -> Result<BackupFileInfo, String> {
    let backups_dir = app_dir.path().join("backups");
    if !backups_dir.exists() {
        std::fs::create_dir_all(&backups_dir)
            .map_err(|e| format!("Failed to create backups directory: {e}"))?;
    }

    let timestamp = current_timestamp();
    let file_name = format!("laya-backup-{timestamp}.sqlite");
    let backup_path = backups_dir.join(&file_name);
    let backup_path_str = backup_path.to_string_lossy().to_string();

    let query = format!("VACUUM INTO '{}'", backup_path_str.replace('\'', "''"));
    sqlx::query(&query)
        .execute(&*pool)
        .await
        .map_err(|e| format!("VACUUM INTO failed: {e}"))?;

    let file_size_bytes = std::fs::metadata(&backup_path).map(|m| m.len()).unwrap_or(0);

    Ok(BackupFileInfo {
        file_name,
        file_path: backup_path_str,
        file_size_bytes,
        created_at: timestamp,
    })
}

#[tauri::command]
fn list_database_backups(app_dir: State<'_, AppDataPath>) -> Result<Vec<BackupFileInfo>, String> {
    let backups_dir = app_dir.path().join("backups");
    if !backups_dir.exists() {
        return Ok(Vec::new());
    }

    let mut list = Vec::new();
    let entries = std::fs::read_dir(&backups_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            let is_sqlite = path
                .extension()
                .map_or(false, |ext| ext == "sqlite" || ext == "db");
            if is_sqlite {
                let file_name = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let meta = entry.metadata().ok();
                let file_size_bytes = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                let created_at = meta
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);

                list.push(BackupFileInfo {
                    file_name,
                    file_path: path.to_string_lossy().to_string(),
                    file_size_bytes,
                    created_at,
                });
            }
        }
    }

    list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(list)
}

#[tauri::command]
async fn restore_database_backup(
    backup_file_path: String,
    pool: State<'_, DbPool>,
    app_dir: State<'_, AppDataPath>,
) -> Result<String, String> {
    let backup_path = std::path::Path::new(&backup_file_path);
    if !backup_path.exists() {
        return Err("Backup file does not exist.".to_string());
    }

    // 1. Create a safety pre-restore backup
    let backups_dir = app_dir.path().join("backups");
    if !backups_dir.exists() {
        let _ = std::fs::create_dir_all(&backups_dir);
    }
    let safety_file = format!("laya-pre-restore-{}.sqlite", current_timestamp());
    let safety_path = backups_dir.join(&safety_file);
    let vacuum_query = format!(
        "VACUUM INTO '{}'",
        safety_path.to_string_lossy().replace('\'', "''")
    );
    let _ = sqlx::query(&vacuum_query).execute(&*pool).await;

    // 2. Perform transactional restoration using ATTACH DATABASE
    let escaped_backup = backup_file_path.replace('\'', "''");
    let attach_sql = format!("ATTACH DATABASE '{}' AS backup_db", escaped_backup);
    sqlx::query(&attach_sql)
        .execute(&*pool)
        .await
        .map_err(|e| format!("Failed to attach backup database: {e}"))?;

    let restore_result = async {
        let _ = sqlx::query("PRAGMA foreign_keys = OFF").execute(&*pool).await;

        let mut tx = pool.begin().await?;

        sqlx::query("DELETE FROM subtasks").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM tasks").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM notes").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM projects").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM settings").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM workspaces").execute(&mut *tx).await?;

        sqlx::query("INSERT INTO workspaces SELECT * FROM backup_db.workspaces").execute(&mut *tx).await?;
        sqlx::query("INSERT INTO settings SELECT * FROM backup_db.settings").execute(&mut *tx).await?;
        sqlx::query("INSERT INTO projects SELECT * FROM backup_db.projects").execute(&mut *tx).await?;
        sqlx::query("INSERT INTO tasks SELECT * FROM backup_db.tasks").execute(&mut *tx).await?;
        sqlx::query("INSERT INTO subtasks SELECT * FROM backup_db.subtasks").execute(&mut *tx).await?;
        sqlx::query("INSERT INTO notes SELECT * FROM backup_db.notes").execute(&mut *tx).await?;

        tx.commit().await?;

        let _ = sqlx::query("PRAGMA foreign_keys = ON").execute(&*pool).await;
        Ok::<(), sqlx::Error>(())
    }
    .await;

    let _ = sqlx::query("DETACH DATABASE backup_db").execute(&*pool).await;

    restore_result.map_err(|e| format!("Database restore failed: {e}"))?;
    Ok("Database restored successfully.".to_string())
}

#[tauri::command]
fn delete_database_backup(backup_file_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&backup_file_path);
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| format!("Failed to delete backup: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn open_backups_folder(app_dir: State<'_, AppDataPath>) -> Result<(), String> {
    let backups_dir = app_dir.path().join("backups");
    if !backups_dir.exists() {
        let _ = std::fs::create_dir_all(&backups_dir);
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&backups_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&backups_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&backups_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
async fn export_full_workspace_json(
    workspace_id: String,
    pool: State<'_, DbPool>,
) -> Result<FullWorkspaceExport, String> {
    let workspace = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE workspace_id = ?")
        .bind(&workspace_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE workspace_id = ?")
        .bind(&workspace_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let subtasks = sqlx::query_as::<_, Subtask>(
        "SELECT s.* FROM subtasks s JOIN tasks t ON s.task_id = t.id WHERE t.workspace_id = ?"
    )
    .bind(&workspace_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let notes = sqlx::query_as::<_, Note>("SELECT * FROM notes WHERE workspace_id = ?")
        .bind(&workspace_id)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut tasks_with_subs = Vec::new();
    for task in tasks {
        let subs = subtasks
            .iter()
            .filter(|s| s.task_id == task.id)
            .cloned()
            .collect();
        tasks_with_subs.push(TaskWithSubtasks {
            task,
            subtasks: subs,
        });
    }

    Ok(FullWorkspaceExport {
        version: "1.0".to_string(),
        exported_at: current_timestamp(),
        workspace,
        projects,
        tasks: tasks_with_subs,
        notes,
    })
}

#[tauri::command]
async fn import_full_workspace_json(
    data: FullWorkspaceExport,
    target_workspace_id: String,
    pool: State<'_, DbPool>,
) -> Result<String, String> {
    let mut imported_tasks = 0;
    let mut imported_notes = 0;
    let mut imported_projects = 0;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    for p in data.projects {
        let res = sqlx::query(
            "INSERT INTO projects (id, workspace_id, name, description, color, cover_image, status, due_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, color=excluded.color, status=excluded.status"
        )
        .bind(&p.id)
        .bind(&target_workspace_id)
        .bind(&p.name)
        .bind(&p.description)
        .bind(&p.color)
        .bind(&p.cover_image)
        .bind(&p.status)
        .bind(p.due_date)
        .bind(p.created_at)
        .bind(p.updated_at)
        .execute(&mut *tx)
        .await;

        if res.is_ok() {
            imported_projects += 1;
        }
    }

    for t_wrap in data.tasks {
        let t = t_wrap.task;
        let res = sqlx::query(
            "INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, start_date, due_date, next_action, completed_at, archived_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, status=excluded.status, priority=excluded.priority, due_date=excluded.due_date"
        )
        .bind(&t.id)
        .bind(&target_workspace_id)
        .bind(&t.project_id)
        .bind(&t.title)
        .bind(&t.description)
        .bind(&t.status)
        .bind(&t.priority)
        .bind(t.start_date)
        .bind(t.due_date)
        .bind(&t.next_action)
        .bind(t.completed_at)
        .bind(t.archived_at)
        .bind(t.created_at)
        .bind(t.updated_at)
        .execute(&mut *tx)
        .await;

        if res.is_ok() {
            imported_tasks += 1;
            for sub in t_wrap.subtasks {
                let _ = sqlx::query(
                    "INSERT INTO subtasks (id, task_id, title, is_completed, position, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET title=excluded.title, is_completed=excluded.is_completed"
                )
                .bind(&sub.id)
                .bind(&sub.task_id)
                .bind(&sub.title)
                .bind(sub.is_completed)
                .bind(sub.position)
                .bind(sub.created_at)
                .execute(&mut *tx)
                .await;
            }
        }
    }

    for n in data.notes {
        let res = sqlx::query(
            "INSERT INTO notes (id, workspace_id, project_id, title, content, is_pinned, is_archived, color, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, is_pinned=excluded.is_pinned, is_archived=excluded.is_archived, color=excluded.color"
        )
        .bind(&n.id)
        .bind(&target_workspace_id)
        .bind(&n.project_id)
        .bind(&n.title)
        .bind(&n.content)
        .bind(n.is_pinned)
        .bind(n.is_archived)
        .bind(&n.color)
        .bind(n.created_at)
        .bind(n.updated_at)
        .execute(&mut *tx)
        .await;

        if res.is_ok() {
            imported_notes += 1;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(format!(
        "Imported {imported_tasks} tasks, {imported_projects} projects, and {imported_notes} notes."
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to resolve app data directory");

            let pool = tauri::async_runtime::block_on(async {
                db::init_db(app_data_dir.clone()).await
            }).expect("failed to initialize SQLite database");

            app.manage(AppDataPath(app_data_dir));
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_system_status,
            get_workspaces,
            set_active_workspace,
            create_workspace,
            get_dashboard_aggregates,
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
            reorder_kanban_tasks,
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
            delete_note,
            get_database_stats,
            create_database_backup,
            list_database_backups,
            restore_database_backup,
            delete_database_backup,
            open_backups_folder,
            export_full_workspace_json,
            import_full_workspace_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
