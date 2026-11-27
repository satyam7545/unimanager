use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_access_secret: String,
    pub jwt_refresh_secret: String,
    pub port: u16,
}

impl AppConfig {
    /// Loads configuration from local workspace `backend/.env`, `%APPDATA%/UniManager/.env`, or environment.
    pub fn load() -> Self {
        let candidates = [
            PathBuf::from(".env"),
            PathBuf::from("../backend/.env"),
            PathBuf::from("../../backend/.env"),
        ];
        for path in candidates {
            if path.exists() {
                let _ = dotenvy::from_path(&path);
                break;
            }
        }
        let _ = dotenvy::dotenv();

        let database_url = std::env::var("DATABASE_URL").unwrap_or_default();
        let jwt_access_secret = std::env::var("JWT_ACCESS_SECRET")
            .unwrap_or_else(|_| "unimanager_access_super_secret_key_12345!".to_string());
        let jwt_refresh_secret = std::env::var("JWT_REFRESH_SECRET")
            .unwrap_or_else(|_| "unimanager_refresh_super_secret_key_54321!".to_string());
        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(5000);

        Self {
            database_url,
            jwt_access_secret,
            jwt_refresh_secret,
            port,
        }
    }
}
