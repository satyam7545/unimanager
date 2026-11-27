use chrono::Utc;
use sqlx::MySqlPool;
use uuid::Uuid;

use crate::error::DbResult;
use crate::models::{AISetting, Conversation, Message};

pub struct AIRepository;

impl AIRepository {
    pub async fn get_setting(pool: &MySqlPool, user_id: &str) -> DbResult<Option<AISetting>> {
        let row = sqlx::query_as::<_, AISetting>(
            "SELECT id, provider, apiKey, endpoint, model, temperature, maxTokens, systemPrompt, userId, createdAt, updatedAt FROM `AISetting` WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;
        Ok(row)
    }

    pub async fn list_conversations(pool: &MySqlPool, user_id: &str) -> DbResult<Vec<Conversation>> {
        let rows = sqlx::query_as::<_, Conversation>(
            "SELECT id, provider, model, userId, createdAt, updatedAt FROM `Conversation` WHERE userId = ? ORDER BY updatedAt DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn create_conversation(
        pool: &MySqlPool,
        user_id: &str,
        provider: &str,
        model: &str,
    ) -> DbResult<Conversation> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `Conversation` (id, provider, model, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(provider)
        .bind(model)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Conversation {
            id,
            provider: provider.to_string(),
            model: model.to_string(),
            user_id: user_id.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn list_messages(pool: &MySqlPool, conversation_id: &str) -> DbResult<Vec<Message>> {
        let rows = sqlx::query_as::<_, Message>(
            "SELECT id, role, content, conversationId, createdAt FROM `Message` WHERE conversationId = ? ORDER BY createdAt ASC",
        )
        .bind(conversation_id)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn add_message(
        pool: &MySqlPool,
        conversation_id: &str,
        role: &str,
        content: &str,
    ) -> DbResult<Message> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO `Message` (id, role, content, conversationId, createdAt) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(role)
        .bind(content)
        .bind(conversation_id)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Message {
            id,
            role: role.to_string(),
            content: content.to_string(),
            conversation_id: conversation_id.to_string(),
            created_at: now,
        })
    }
}
