use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database query failed: {0}")]
    Sqlx(#[from] sqlx::Error),

    #[error("Record not found: {0}")]
    NotFound(String),

    #[error("Database pool is not connected")]
    Disconnected,
}

pub type DbResult<T> = Result<T, DbError>;
