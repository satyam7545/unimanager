use chrono::{DateTime, Utc};
use sqlx::MySqlPool;
use uuid::Uuid;

use crate::error::DbResult;
use crate::models::{Assignment, Attachment, Folder, Note, Subject, Tag};

pub struct AcademicRepository;

impl AcademicRepository {
    // --- Subjects ---
    pub async fn list_subjects(pool: &MySqlPool, user_id: &str, semester: Option<&str>) -> DbResult<Vec<Subject>> {
        let rows = match semester {
            Some(sem) if !sem.is_empty() && sem != "all" => {
                sqlx::query_as::<_, Subject>(
                    "SELECT id, name, color, semester, userId, createdAt, updatedAt FROM `Subject` WHERE userId = ? AND semester = ? ORDER BY name ASC",
                )
                .bind(user_id)
                .bind(sem)
                .fetch_all(pool)
                .await?
            }
            _ => {
                sqlx::query_as::<_, Subject>(
                    "SELECT id, name, color, semester, userId, createdAt, updatedAt FROM `Subject` WHERE userId = ? ORDER BY name ASC",
                )
                .bind(user_id)
                .fetch_all(pool)
                .await?
            }
        };
        Ok(rows)
    }

    pub async fn create_subject(
        pool: &MySqlPool,
        user_id: &str,
        name: &str,
        color: &str,
        semester: Option<&str>,
    ) -> DbResult<Subject> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `Subject` (id, name, color, semester, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(name)
        .bind(color)
        .bind(semester)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Subject {
            id,
            name: name.to_string(),
            color: color.to_string(),
            semester: semester.map(str::to_string),
            user_id: user_id.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn delete_subject(pool: &MySqlPool, user_id: &str, id: &str) -> DbResult<()> {
        sqlx::query("DELETE FROM `Subject` WHERE id = ? AND userId = ?")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    // --- Notes ---
    pub async fn list_notes(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Note>> {
        let rows = sqlx::query_as::<_, Note>(
            "SELECT id, title, content, isRichText, isPinned, isFavorite, folderId, subjectId, semester, userId, createdAt, updatedAt FROM `Note` WHERE userId = ? ORDER BY isPinned DESC, updatedAt DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_note(
        pool: &MySqlPool,
        user_id: &str,
        title: &str,
        content: &str,
        subject_id: Option<&str>,
        folder_id: Option<&str>,
        semester: Option<&str>,
    ) -> DbResult<Note> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `Note` (id, title, content, isRichText, isPinned, isFavorite, folderId, subjectId, semester, userId, createdAt, updatedAt) VALUES (?, ?, ?, false, false, false, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(title)
        .bind(content)
        .bind(folder_id)
        .bind(subject_id)
        .bind(semester)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Note {
            id,
            title: title.to_string(),
            content: content.to_string(),
            is_rich_text: false,
            is_pinned: false,
            is_favorite: false,
            folder_id: folder_id.map(str::to_string),
            subject_id: subject_id.map(str::to_string),
            semester: semester.map(str::to_string),
            user_id: user_id.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn update_note(
        pool: &MySqlPool,
        user_id: &str,
        id: &str,
        title: &str,
        content: &str,
        is_pinned: bool,
        is_favorite: bool,
    ) -> DbResult<()> {
        sqlx::query(
            "UPDATE `Note` SET title = ?, content = ?, isPinned = ?, isFavorite = ?, updatedAt = ? WHERE id = ? AND userId = ?",
        )
        .bind(title)
        .bind(content)
        .bind(is_pinned)
        .bind(is_favorite)
        .bind(Utc::now())
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
        Ok(())
    }

    pub async fn delete_note(pool: &MySqlPool, user_id: &str, id: &str) -> DbResult<()> {
        sqlx::query("DELETE FROM `Note` WHERE id = ? AND userId = ?")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    // --- Folders & Tags ---
    pub async fn list_folders(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Folder>> {
        let rows = sqlx::query_as::<_, Folder>(
            "SELECT id, name, parentId, userId, createdAt, updatedAt FROM `Folder` WHERE userId = ? ORDER BY name ASC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn list_tags(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Tag>> {
        let rows = sqlx::query_as::<_, Tag>(
            "SELECT id, name, color, userId, createdAt, updatedAt FROM `Tag` WHERE userId = ? ORDER BY name ASC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    // --- Assignments ---
    pub async fn list_assignments(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Assignment>> {
        let rows = sqlx::query_as::<_, Assignment>(
            "SELECT id, title, description, priority, status, deadline, estimatedHours, subjectId, semester, userId, createdAt, updatedAt FROM `Assignment` WHERE userId = ? ORDER BY deadline ASC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_assignment(
        pool: &MySqlPool,
        user_id: &str,
        title: &str,
        description: Option<&str>,
        priority: &str,
        deadline: DateTime<Utc>,
        estimated_hours: f64,
        subject_id: Option<&str>,
        semester: Option<&str>,
    ) -> DbResult<Assignment> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `Assignment` (id, title, description, priority, status, deadline, estimatedHours, subjectId, semester, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(title)
        .bind(description)
        .bind(priority)
        .bind(deadline)
        .bind(estimated_hours)
        .bind(subject_id)
        .bind(semester)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Assignment {
            id,
            title: title.to_string(),
            description: description.map(str::to_string),
            priority: priority.to_string(),
            status: "PENDING".to_string(),
            deadline,
            estimated_hours: Some(estimated_hours),
            subject_id: subject_id.map(str::to_string),
            semester: semester.map(str::to_string),
            user_id: user_id.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn update_assignment_status(pool: &MySqlPool, user_id: &str, id: &str, status: &str) -> DbResult<()> {
        sqlx::query("UPDATE `Assignment` SET status = ?, updatedAt = ? WHERE id = ? AND userId = ?")
            .bind(status)
            .bind(Utc::now())
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn delete_assignment(pool: &MySqlPool, user_id: &str, id: &str) -> DbResult<()> {
        sqlx::query("DELETE FROM `Assignment` WHERE id = ? AND userId = ?")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    // --- Attachments ---
    pub async fn list_attachments(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Attachment>> {
        let rows = sqlx::query_as::<_, Attachment>(
            "SELECT id, fileName, fileType, filePath, fileSize, noteId, projectId, assignmentId, userId, createdAt, updatedAt FROM `Attachment` WHERE userId = ? ORDER BY createdAt DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }
}
