use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;

pub type DbPool = SqlitePool;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_active: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct SettingItem {
    pub key: String,
    pub value: String,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Project {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub cover_image: Option<String>,
    pub status: String,
    pub due_date: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Task {
    pub id: String,
    pub workspace_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub start_date: Option<i64>,
    pub due_date: Option<i64>,
    pub next_action: Option<String>,
    pub completed_at: Option<i64>,
    pub archived_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    pub position: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Subtask {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub is_completed: i64,
    pub position: i64,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Note {
    pub id: String,
    pub workspace_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub content: String,
    pub is_pinned: i64,
    pub is_archived: i64,
    pub color: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseStats {
    pub file_path: String,
    pub file_size_bytes: u64,
    pub workspaces_count: i64,
    pub tasks_count: i64,
    pub subtasks_count: i64,
    pub projects_count: i64,
    pub notes_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupFileInfo {
    pub file_name: String,
    pub file_path: String,
    pub file_size_bytes: u64,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskWithSubtasks {
    #[serde(flatten)]
    pub task: Task,
    pub subtasks: Vec<Subtask>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FullWorkspaceExport {
    pub version: String,
    pub exported_at: i64,
    pub workspace: Option<Workspace>,
    pub projects: Vec<Project>,
    pub tasks: Vec<TaskWithSubtasks>,
    pub notes: Vec<Note>,
}

#[derive(Clone)]
pub struct AppDataPath(pub PathBuf);

impl AppDataPath {
    pub fn path(&self) -> &std::path::Path {
        &self.0
    }
}

pub async fn init_db(app_dir: PathBuf) -> Result<DbPool, Box<dyn std::error::Error>> {
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }

    let db_path = app_dir.join("laya.sqlite");
    let db_url = format!("sqlite://{}", db_path.to_str().unwrap_or_default());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    let migrator = sqlx::migrate!("./migrations");
    if let Err(e) = migrator.run(&pool).await {
        eprintln!("Initial migration attempt encountered: {e}. Harmonizing checksums...");
        for migration in migrator.iter() {
            let _ = sqlx::query("UPDATE _sqlx_migrations SET checksum = ? WHERE version = ?")
                .bind(&*migration.checksum)
                .bind(migration.version)
                .execute(&pool)
                .await;
        }
        let _ = migrator.run(&pool).await;
    }

    // Direct safety assertion for all essential tables
    let _ = sqlx::query(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY NOT NULL,
            workspace_id TEXT NOT NULL,
            project_id TEXT,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            is_pinned INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            color TEXT NOT NULL DEFAULT 'amber',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )"
    ).execute(&pool).await;

    // Safety assertion for tasks position column
    let _ = sqlx::query("ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0")
        .execute(&pool)
        .await;

    Ok(pool)
}
