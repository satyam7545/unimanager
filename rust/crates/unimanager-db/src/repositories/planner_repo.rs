use chrono::{DateTime, Utc};
use sqlx::MySqlPool;
use uuid::Uuid;

use crate::error::DbResult;
use crate::models::{Event, Habit, HabitLog, Notification, Project, Task};

pub struct PlannerRepository;

impl PlannerRepository {
    // --- Tasks ---
    pub async fn list_tasks(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Task>> {
        let rows = sqlx::query_as::<_, Task>(
            "SELECT id, title, status, priority, `order`, columnId, projectId, assignmentId, subjectId, parentId, estimatedMinutes, actualMinutes, `date`, timeSlot, userId, createdAt, updatedAt FROM `Task` WHERE userId = ? ORDER BY `order` ASC, createdAt DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_task(
        pool: &MySqlPool,
        user_id: &str,
        title: &str,
        priority: &str,
        date: Option<DateTime<Utc>>,
        time_slot: Option<&str>,
        subject_id: Option<&str>,
        project_id: Option<&str>,
        estimated_minutes: Option<i32>,
    ) -> DbResult<Task> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let slot = time_slot.unwrap_or("AFTERNOON");
        let est = estimated_minutes.unwrap_or(30);

        sqlx::query(
            "INSERT INTO `Task` (id, title, status, priority, `order`, columnId, projectId, subjectId, estimatedMinutes, `date`, timeSlot, userId, createdAt, updatedAt) VALUES (?, ?, 'TODO', ?, 0, 'ideas', ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(title)
        .bind(priority)
        .bind(project_id)
        .bind(subject_id)
        .bind(est)
        .bind(date)
        .bind(slot)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Task {
            id,
            title: title.to_string(),
            status: "TODO".to_string(),
            priority: priority.to_string(),
            order: 0,
            column_id: "ideas".to_string(),
            project_id: project_id.map(str::to_string),
            assignment_id: None,
            subject_id: subject_id.map(str::to_string),
            parent_id: None,
            estimated_minutes: Some(est),
            actual_minutes: None,
            date,
            time_slot: Some(slot.to_string()),
            user_id: user_id.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn update_task_status(pool: &MySqlPool, user_id: &str, id: &str, status: &str) -> DbResult<()> {
        sqlx::query("UPDATE `Task` SET status = ?, updatedAt = ? WHERE id = ? AND userId = ?")
            .bind(status)
            .bind(Utc::now())
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn update_task_slot(pool: &MySqlPool, user_id: &str, id: &str, time_slot: &str) -> DbResult<()> {
        sqlx::query("UPDATE `Task` SET timeSlot = ?, updatedAt = ? WHERE id = ? AND userId = ?")
            .bind(time_slot)
            .bind(Utc::now())
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn delete_task(pool: &MySqlPool, user_id: &str, id: &str) -> DbResult<()> {
        sqlx::query("DELETE FROM `Task` WHERE id = ? AND userId = ?")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    // --- Projects ---
    pub async fn list_projects(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Project>> {
        let rows = sqlx::query_as::<_, Project>(
            "SELECT id, name, description, githubUrl, progress, userId, createdAt, updatedAt FROM `Project` WHERE userId = ? ORDER BY updatedAt DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_project(
        pool: &MySqlPool,
        user_id: &str,
        name: &str,
        description: Option<&str>,
        github_url: Option<&str>,
    ) -> DbResult<Project> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `Project` (id, name, description, githubUrl, progress, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0.0, ?, ?, ?)",
        )
        .bind(&id)
        .bind(name)
        .bind(description)
        .bind(github_url)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Project {
            id,
            name: name.to_string(),
            description: description.map(str::to_string),
            github_url: github_url.map(str::to_string),
            progress: 0.0,
            user_id: user_id.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    // --- Events ---
    pub async fn list_events(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Event>> {
        let rows = sqlx::query_as::<_, Event>(
            "SELECT id, title, description, startAt, endAt, color, isAllDay, eventType, subjectId, userId, createdAt, updatedAt FROM `Event` WHERE userId = ? ORDER BY startAt ASC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_event(
        pool: &MySqlPool,
        user_id: &str,
        title: &str,
        start_at: DateTime<Utc>,
        end_at: DateTime<Utc>,
        event_type: &str,
        color: &str,
        subject_id: Option<&str>,
    ) -> DbResult<Event> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `Event` (id, title, startAt, endAt, color, isAllDay, eventType, subjectId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, false, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(title)
        .bind(start_at)
        .bind(end_at)
        .bind(color)
        .bind(event_type)
        .bind(subject_id)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Event {
            id,
            title: title.to_string(),
            description: None,
            start_at,
            end_at,
            color: color.to_string(),
            is_all_day: false,
            event_type: event_type.to_string(),
            subject_id: subject_id.map(str::to_string),
            user_id: user_id.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    // --- Habits ---
    pub async fn list_habits(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Habit>> {
        let rows = sqlx::query_as::<_, Habit>(
            "SELECT id, name, icon, frequency, target, userId, createdAt, updatedAt FROM `Habit` WHERE userId = ? ORDER BY createdAt ASC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn log_habit(pool: &MySqlPool, habit_id: &str, value: i32) -> DbResult<HabitLog> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `HabitLog` (id, habitId, completedAt, value, createdAt) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(habit_id)
        .bind(now)
        .bind(value)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(HabitLog {
            id,
            habit_id: habit_id.to_string(),
            completed_at: now,
            value,
            created_at: now,
        })
    }

    // --- Notifications ---
    pub async fn list_notifications(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Notification>> {
        let rows = sqlx::query_as::<_, Notification>(
            "SELECT id, title, message, isRead, userId, createdAt, updatedAt FROM `Notification` WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }
}
