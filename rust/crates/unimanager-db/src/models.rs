use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub name: String,
    pub semester: Option<String>,
    pub study_streak: i32,
    pub last_active_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct RefreshToken {
    pub id: String,
    pub token: String,
    pub user_id: String,
    pub expires_at: DateTime<Utc>,
    pub revoked: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Subject {
    pub id: String,
    pub name: String,
    pub color: String,
    pub semester: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub is_rich_text: bool,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub folder_id: Option<String>,
    pub subject_id: Option<String>,
    pub semester: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Assignment {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub deadline: DateTime<Utc>,
    pub estimated_hours: Option<f64>,
    pub subject_id: Option<String>,
    pub semester: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub github_url: Option<String>,
    pub progress: f64,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: String,
    pub priority: String,
    #[sqlx(rename = "order")]
    pub order: i32,
    pub column_id: String,
    pub project_id: Option<String>,
    pub assignment_id: Option<String>,
    pub subject_id: Option<String>,
    pub parent_id: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub actual_minutes: Option<i32>,
    pub date: Option<DateTime<Utc>>,
    pub time_slot: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Habit {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub frequency: String,
    pub target: i32,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct HabitLog {
    pub id: String,
    pub habit_id: String,
    pub completed_at: DateTime<Utc>,
    pub value: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub color: String,
    pub is_all_day: bool,
    pub event_type: String,
    pub subject_id: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Resource {
    pub id: String,
    pub title: String,
    #[sqlx(rename = "type")]
    pub resource_type: String,
    pub url: String,
    pub subject_id: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub provider: String,
    pub model: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
    pub conversation_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct AISetting {
    pub id: String,
    pub provider: String,
    pub api_key: Option<String>,
    pub endpoint: Option<String>,
    pub model: Option<String>,
    pub temperature: f64,
    pub max_tokens: i32,
    pub system_prompt: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, FromRow)]
#[sqlx(rename_all = "camelCase")]
pub struct Attachment {
    pub id: String,
    pub file_name: String,
    pub file_type: String,
    pub file_path: String,
    pub file_size: i32,
    pub note_id: Option<String>,
    pub project_id: Option<String>,
    pub assignment_id: Option<String>,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
