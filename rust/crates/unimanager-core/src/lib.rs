pub mod auth;
pub mod config;
pub mod dashboard;
pub mod pdf;

pub use auth::{AuthError, AuthService, Claims};
pub use config::AppConfig;
pub use dashboard::{DashboardEngine, DashboardSummary, PrioritizedTask};

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use unimanager_db::models::{Task, User};

    #[test]
    fn bcrypt_and_jwt_roundtrip() {
        let hash = AuthService::hash_password("SuperSecret123!").expect("hash failed");
        assert!(AuthService::verify_password("SuperSecret123!", &hash).expect("verify failed"));
        assert!(!AuthService::verify_password("WrongPass", &hash).expect("verify failed"));

        let user = User {
            id: "u1".to_string(),
            email: "student@niu.edu".to_string(),
            password_hash: hash,
            name: "Satyam".to_string(),
            semester: Some("6".to_string()),
            study_streak: 5,
            last_active_at: Utc::now(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let token = AuthService::issue_access_token(&user, "test_secret_key").expect("jwt sign");
        let claims = AuthService::verify_access_token(&token, "test_secret_key").expect("jwt verify");
        assert_eq!(claims.sub, "u1");
        assert_eq!(claims.email, "student@niu.edu");
    }

    #[test]
    fn dashboard_prioritizes_urgent_tasks_first() {
        let tasks = vec![
            Task {
                id: "t1".to_string(),
                title: "Read chapter 1".to_string(),
                status: "TODO".to_string(),
                priority: "LOW".to_string(),
                order: 0,
                column_id: "ideas".to_string(),
                project_id: None,
                assignment_id: None,
                subject_id: None,
                parent_id: None,
                estimated_minutes: Some(20),
                actual_minutes: None,
                date: None,
                time_slot: Some("MORNING".to_string()),
                user_id: "u1".to_string(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            Task {
                id: "t2".to_string(),
                title: "Submit OS Lab".to_string(),
                status: "TODO".to_string(),
                priority: "URGENT".to_string(),
                order: 1,
                column_id: "ideas".to_string(),
                project_id: None,
                assignment_id: None,
                subject_id: None,
                parent_id: None,
                estimated_minutes: Some(45),
                actual_minutes: None,
                date: None,
                time_slot: Some("AFTERNOON".to_string()),
                user_id: "u1".to_string(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
        ];

        let summary = DashboardEngine::build_summary(5, &[], &tasks, &[], &[], &[]);
        assert_eq!(summary.pending_tasks_count, 2);
        assert_eq!(summary.what_to_work_on_now.unwrap().id, "t2");
    }
}
