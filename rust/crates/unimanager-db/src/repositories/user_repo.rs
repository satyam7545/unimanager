use chrono::{DateTime, Utc};
use sqlx::MySqlPool;
use uuid::Uuid;

use crate::error::DbResult;
use crate::models::{RefreshToken, User};

pub struct UserRepository;

impl UserRepository {
    pub async fn find_by_email(pool: &MySqlPool, email: &str) -> DbResult<Option<User>> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, passwordHash, name, semester, studyStreak, lastActiveAt, createdAt, updatedAt FROM `User` WHERE email = ?",
        )
        .bind(email)
        .fetch_optional(pool)
        .await?;
        Ok(user)
    }

    pub async fn find_by_id(pool: &MySqlPool, id: &str) -> DbResult<Option<User>> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, passwordHash, name, semester, studyStreak, lastActiveAt, createdAt, updatedAt FROM `User` WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;
        Ok(user)
    }

    pub async fn create(
        pool: &MySqlPool,
        email: &str,
        password_hash: &str,
        name: &str,
        semester: Option<&str>,
    ) -> DbResult<User> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `User` (id, email, passwordHash, name, semester, studyStreak, lastActiveAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
        )
        .bind(&id)
        .bind(email)
        .bind(password_hash)
        .bind(name)
        .bind(semester)
        .bind(now)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Self::find_by_id(pool, &id)
            .await?
            .ok_or_else(|| crate::error::DbError::NotFound(format!("User {id}")))
    }

    pub async fn update_streak(pool: &MySqlPool, id: &str, streak: i32, last_active: DateTime<Utc>) -> DbResult<()> {
        sqlx::query("UPDATE `User` SET studyStreak = ?, lastActiveAt = ?, updatedAt = ? WHERE id = ?")
            .bind(streak)
            .bind(last_active)
            .bind(Utc::now())
            .bind(id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn store_refresh_token(
        pool: &MySqlPool,
        user_id: &str,
        token: &str,
        expires_at: DateTime<Utc>,
    ) -> DbResult<RefreshToken> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `RefreshToken` (id, token, userId, expiresAt, revoked, createdAt) VALUES (?, ?, ?, ?, false, ?)",
        )
        .bind(&id)
        .bind(token)
        .bind(user_id)
        .bind(expires_at)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(RefreshToken {
            id,
            token: token.to_string(),
            user_id: user_id.to_string(),
            expires_at,
            revoked: false,
            created_at: now,
        })
    }

    pub async fn find_refresh_token(pool: &MySqlPool, token: &str) -> DbResult<Option<RefreshToken>> {
        let rt = sqlx::query_as::<_, RefreshToken>(
            "SELECT id, token, userId, expiresAt, revoked, createdAt FROM `RefreshToken` WHERE token = ?",
        )
        .bind(token)
        .fetch_optional(pool)
        .await?;
        Ok(rt)
    }

    pub async fn revoke_refresh_token(pool: &MySqlPool, token: &str) -> DbResult<()> {
        sqlx::query("UPDATE `RefreshToken` SET revoked = true WHERE token = ?")
            .bind(token)
            .execute(pool)
            .await?;
        Ok(())
    }
}
