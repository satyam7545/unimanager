use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use unimanager_db::models::User;
use unimanager_db::repositories::user_repo::UserRepository;
use unimanager_db::MySqlPool;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid email or password")]
    InvalidCredentials,

    #[error("Email already registered")]
    EmailExists,

    #[error("Token error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("Database error: {0}")]
    Db(#[from] unimanager_db::DbError),

    #[error("Password hashing error: {0}")]
    Bcrypt(#[from] bcrypt::BcryptError),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub exp: usize,
}

pub struct AuthService;

impl AuthService {
    pub fn hash_password(password: &str) -> Result<String, AuthError> {
        Ok(bcrypt::hash(password, 10)?)
    }

    /// Verifies plaintext password against existing Node/Prisma bcrypt hashes (`$2b$` / `$2a$`).
    pub fn verify_password(password: &str, hash: &str) -> Result<bool, AuthError> {
        Ok(bcrypt::verify(password, hash)?)
    }

    pub fn issue_access_token(user: &User, secret: &str) -> Result<String, AuthError> {
        let exp = (Utc::now() + Duration::minutes(15)).timestamp() as usize;
        let claims = Claims {
            sub: user.id.clone(),
            email: user.email.clone(),
            exp,
        };
        Ok(encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )?)
    }

    pub fn verify_access_token(token: &str, secret: &str) -> Result<Claims, AuthError> {
        let data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::default(),
        )?;
        Ok(data.claims)
    }

    pub async fn login(pool: &MySqlPool, email: &str, password: &str) -> Result<User, AuthError> {
        let user = UserRepository::find_by_email(pool, email)
            .await?
            .ok_or(AuthError::InvalidCredentials)?;

        if !Self::verify_password(password, &user.password_hash)? {
            return Err(AuthError::InvalidCredentials);
        }
        Ok(user)
    }

    pub async fn register(
        pool: &MySqlPool,
        email: &str,
        password: &str,
        name: &str,
        semester: Option<&str>,
    ) -> Result<User, AuthError> {
        if UserRepository::find_by_email(pool, email).await?.is_some() {
            return Err(AuthError::EmailExists);
        }
        let hash = Self::hash_password(password)?;
        let user = UserRepository::create(pool, email, &hash, name, semester).await?;
        Ok(user)
    }
}
