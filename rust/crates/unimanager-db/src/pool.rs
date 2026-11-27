use sqlx::mysql::{MySqlPool, MySqlPoolOptions};
use std::time::Duration;
use tracing::{info, warn};

use crate::error::DbResult;

/// Creates a MySQL connection pool compatible with the existing UniManager Prisma schema.
pub async fn create_pool(database_url: &str) -> DbResult<MySqlPool> {
    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(10))
        .connect(database_url)
        .await?;

    info!("Connected to MySQL database via SQLx");
    Ok(pool)
}

/// Attempts connection with exponential backoff, returning None if offline.
pub async fn connect_with_retry(database_url: &str, retries: u32) -> Option<MySqlPool> {
    for attempt in 1..=retries {
        match create_pool(database_url).await {
            Ok(pool) => return Some(pool),
            Err(err) => {
                warn!("Database connection attempt {attempt}/{retries} failed: {err}");
                if attempt < retries {
                    tokio::time::sleep(Duration::from_secs(2 * attempt as u64)).await;
                }
            }
        }
    }
    None
}
