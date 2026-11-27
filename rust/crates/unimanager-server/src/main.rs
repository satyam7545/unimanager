use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use unimanager_core::{AppConfig, AuthService};
use unimanager_db::{connect_with_retry, MySqlPool};

#[derive(Clone)]
struct AppState {
    pool: Option<MySqlPool>,
    config: AppConfig,
}

#[derive(Deserialize)]
struct LoginBody {
    email: String,
    password: String,
}

async fn health(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let connected = state.pool.is_some();
    Json(json!({
        "status": "success",
        "runtime": "rust-axum",
        "database": if connected { "connected" } else { "disconnected" }
    }))
}

async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginBody>,
) -> impl IntoResponse {
    let Some(pool) = &state.pool else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "status": "error", "message": "Database disconnected" })),
        )
            .into_response();
    };

    match AuthService::login(pool, &body.email, &body.password).await {
        Ok(user) => match AuthService::issue_access_token(&user, &state.config.jwt_access_secret) {
            Ok(token) => (
                StatusCode::OK,
                Json(json!({
                    "status": "success",
                    "accessToken": token,
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "semester": user.semester,
                        "studyStreak": user.study_streak
                    }
                })),
            )
                .into_response(),
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "status": "error", "message": e.to_string() })),
            )
                .into_response(),
        },
        Err(e) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "status": "error", "message": e.to_string() })),
        )
            .into_response(),
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    let config = AppConfig::load();
    let pool = if config.database_url.is_empty() {
        None
    } else {
        connect_with_retry(&config.database_url, 3).await
    };

    let state = Arc::new(AppState {
        pool,
        config: config.clone(),
    });

    let app = Router::new()
        .route("/api/v1/health", get(health))
        .route("/api/v1/auth/login", post(login))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state(state);

    let addr = format!("0.0.0.0:{}", config.port);
    info!("UniManager Rust Axum server listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
