mod state;
mod views;

use dioxus::prelude::*;
use unimanager_core::{AppConfig, AuthService, DashboardEngine};
use unimanager_db::connect_with_retry;
use unimanager_db::repositories::academic_repo::AcademicRepository;
use unimanager_db::repositories::ai_repo::AIRepository;
use unimanager_db::repositories::planner_repo::PlannerRepository;
use unimanager_db::MySqlPool;

use crate::state::{Route, WorkspaceData};
use crate::views::{
    AIAssistantView, AssignmentsView, DashboardView, NotesView, PlannerView, SubjectsView,
};

const STYLES: &str = include_str!("../assets/styles.css");

fn main() {
    tracing_subscriber::fmt::init();
    dioxus::LaunchBuilder::desktop().launch(App);
}

async fn load_workspace_data(pool: &MySqlPool, user_id: &str, streak: i32) -> WorkspaceData {
    let subjects = AcademicRepository::list_subjects(pool, user_id, None)
        .await
        .unwrap_or_default();
    let tasks = PlannerRepository::list_tasks(pool, user_id)
        .await
        .unwrap_or_default();
    let assignments = AcademicRepository::list_assignments(pool, user_id)
        .await
        .unwrap_or_default();
    let notes = AcademicRepository::list_notes(pool, user_id)
        .await
        .unwrap_or_default();
    let projects = PlannerRepository::list_projects(pool, user_id)
        .await
        .unwrap_or_default();
    let habits = PlannerRepository::list_habits(pool, user_id)
        .await
        .unwrap_or_default();
    let events = PlannerRepository::list_events(pool, user_id)
        .await
        .unwrap_or_default();
    let ai_setting = AIRepository::get_setting(pool, user_id)
        .await
        .unwrap_or(None);
    let conversations = AIRepository::list_conversations(pool, user_id)
        .await
        .unwrap_or_default();

    let summary = Some(DashboardEngine::build_summary(
        streak,
        &subjects,
        &tasks,
        &assignments,
        &events,
        &habits,
    ));

    WorkspaceData {
        subjects,
        tasks,
        assignments,
        notes,
        projects,
        habits,
        events,
        ai_setting,
        conversations,
        summary,
    }
}

#[component]
fn App() -> Element {
    let mut pool_sig = use_context_provider(|| Signal::new(None::<MySqlPool>));
    let mut user_sig = use_signal(|| None::<unimanager_db::models::User>);
    let mut route = use_signal(|| Route::Dashboard);
    let mut light_mode = use_signal(|| false);
    let mut data_sig = use_signal(WorkspaceData::default);
    let mut db_status = use_signal(|| "Connecting to MySQL...".to_string());

    // Auth form state
    let mut email = use_signal(String::new);
    let mut password = use_signal(String::new);
    let mut auth_error = use_signal(|| None::<String>);

    use_effect(move || {
        spawn(async move {
            let cfg = AppConfig::load();
            if cfg.database_url.is_empty() {
                db_status.set("DATABASE_URL not set".to_string());
                return;
            }
            match connect_with_retry(&cfg.database_url, 3).await {
                Some(pool) => {
                    pool_sig.set(Some(pool));
                    db_status.set("MySQL Connected".to_string());
                }
                None => {
                    db_status.set("MySQL Offline".to_string());
                }
            }
        });
    });

    let refresh_data = move |_| {
        let p = pool_sig.read().clone();
        let u = user_sig.read().clone();
        spawn(async move {
            if let (Some(pool), Some(user)) = (p, u) {
                let fresh = load_workspace_data(&pool, &user.id, user.study_streak).await;
                data_sig.set(fresh);
            }
        });
    };

    let theme_class = if *light_mode.read() { "light" } else { "" };

    rsx! {
        style { "{STYLES}" }
        div { class: "{theme_class}",
            if let Some(user) = user_sig.read().clone() {
                div { class: "app-shell",
                    aside { class: "sidebar",
                        div { class: "brand",
                            div { class: "brand-badge", "U" }
                            span { "UniManager" }
                        }

                        div {
                            div { class: "nav-group-label", "Workspace" }
                            for r in [Route::Dashboard, Route::Planner, Route::Calendar] {
                                button {
                                    class: if *route.read() == r { "nav-btn active" } else { "nav-btn" },
                                    onclick: move |_| route.set(r),
                                    "{r.title()}"
                                }
                            }
                        }

                        div {
                            div { class: "nav-group-label", "Academics" }
                            for r in [Route::Subjects, Route::Assignments, Route::Notes, Route::Projects, Route::Habits] {
                                button {
                                    class: if *route.read() == r { "nav-btn active" } else { "nav-btn" },
                                    onclick: move |_| route.set(r),
                                    "{r.title()}"
                                }
                            }
                        }

                        div {
                            div { class: "nav-group-label", "Intelligence" }
                            for r in [Route::AIAssistant, Route::Analytics] {
                                button {
                                    class: if *route.read() == r { "nav-btn active" } else { "nav-btn" },
                                    onclick: move |_| route.set(r),
                                    "{r.title()}"
                                }
                            }
                        }

                        div { style: "margin-top: auto;",
                            div { class: "nav-group-label", "Account" }
                            for r in [Route::Profile, Route::Settings] {
                                button {
                                    class: if *route.read() == r { "nav-btn active" } else { "nav-btn" },
                                    onclick: move |_| route.set(r),
                                    "{r.title()}"
                                }
                            }
                        }
                    }

                    div { class: "main-area",
                        header { class: "topbar",
                            span { style: "font-weight: 700; font-size: 14px;", "{route.read().title()}" }
                            div { style: "display: flex; align-items: center; gap: 10px;",
                                span { style: "font-size: 11px; color: var(--muted);", "{db_status}" }
                                button {
                                    class: "btn-secondary",
                                    onclick: move |_| {
                                        let cur = *light_mode.read();
                                        light_mode.set(!cur);
                                    },
                                    if *light_mode.read() { "Dark Mode" } else { "Light Mode" }
                                }
                                button {
                                    class: "btn-secondary",
                                    onclick: move |_| {
                                        user_sig.set(None);
                                    },
                                    "Logout"
                                }
                            }
                        }

                        main { class: "content",
                            match *route.read() {
                                Route::Dashboard => rsx! {
                                    DashboardView {
                                        user_name: user.name.clone(),
                                        user_id: user.id.clone(),
                                        data: data_sig.read().clone(),
                                        on_refresh: refresh_data,
                                    }
                                },
                                Route::Planner => rsx! {
                                    PlannerView {
                                        user_id: user.id.clone(),
                                        data: data_sig.read().clone(),
                                        on_refresh: refresh_data,
                                    }
                                },
                                Route::Subjects => rsx! {
                                    SubjectsView {
                                        user_id: user.id.clone(),
                                        data: data_sig.read().clone(),
                                        on_refresh: refresh_data,
                                    }
                                },
                                Route::Assignments => rsx! {
                                    AssignmentsView {
                                        user_id: user.id.clone(),
                                        data: data_sig.read().clone(),
                                        on_refresh: refresh_data,
                                    }
                                },
                                Route::Notes => rsx! {
                                    NotesView {
                                        user_id: user.id.clone(),
                                        data: data_sig.read().clone(),
                                        on_refresh: refresh_data,
                                    }
                                },
                                Route::AIAssistant => rsx! {
                                    AIAssistantView {
                                        data: data_sig.read().clone(),
                                    }
                                },
                                Route::Calendar => rsx! {
                                    div { class: "glass-card",
                                        h3 { "Upcoming Events ({data_sig.read().events.len()})" }
                                        for ev in data_sig.read().events.clone() {
                                            div { key: "{ev.id}", style: "padding: 8px 0; border-bottom: 1px solid var(--border);",
                                                strong { "{ev.title}" }
                                                span { style: "color: var(--muted); font-size: 12px; margin-left: 8px;",
                                                    {format!("{} · {}", ev.event_type, ev.start_at.format("%Y-%m-%d %H:%M"))}
                                                }
                                            }
                                        }
                                    }
                                },
                                Route::Projects => rsx! {
                                    div { class: "glass-card",
                                        h3 { "Projects ({data_sig.read().projects.len()})" }
                                        for proj in data_sig.read().projects.clone() {
                                            div { key: "{proj.id}", style: "padding: 10px 0; border-bottom: 1px solid var(--border);",
                                                strong { "{proj.name}" }
                                                span { style: "color: var(--muted); font-size: 12px; margin-left: 8px;", "{proj.progress:.0}% complete" }
                                            }
                                        }
                                    }
                                },
                                Route::Habits => rsx! {
                                    div { class: "glass-card",
                                        h3 { "Habits ({data_sig.read().habits.len()})" }
                                        for hab in data_sig.read().habits.clone() {
                                            div { key: "{hab.id}", style: "padding: 10px 0; border-bottom: 1px solid var(--border);",
                                                strong { "{hab.name}" }
                                                span { style: "color: var(--muted); font-size: 12px; margin-left: 8px;", "{hab.frequency} · target {hab.target}" }
                                            }
                                        }
                                    }
                                },
                                Route::Analytics | Route::Profile | Route::Settings => rsx! {
                                    div { class: "glass-card",
                                        h3 { "{route.read().title()}" }
                                        p { style: "color: var(--muted); font-size: 13px;", "Signed in as {user.name} ({user.email}) · Pure Rust Desktop v2.0.0" }
                                    }
                                },
                            }
                        }
                    }
                }
            } else {
                div { style: "min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg);",
                    div { class: "glass-card", style: "width: 380px; display: flex; flex-direction: column; gap: 14px;",
                        div { class: "brand",
                            div { class: "brand-badge", "U" }
                            span { "UniManager Rust" }
                        }
                        div { style: "font-size: 12px; color: var(--muted);", "{db_status}" }
                        if let Some(err) = auth_error.read().clone() {
                            div { style: "padding: 8px 10px; border-radius: 8px; background: rgba(244,63,94,0.15); color: var(--rose); font-size: 12px;", "{err}" }
                        }
                        input {
                            class: "input-field",
                            placeholder: "Email",
                            value: "{email}",
                            oninput: move |e| email.set(e.value()),
                        }
                        input {
                            class: "input-field",
                            r#type: "password",
                            placeholder: "Password",
                            value: "{password}",
                            oninput: move |e| password.set(e.value()),
                        }
                        button {
                            class: "btn-primary",
                            onclick: move |_| {
                                let p = pool_sig.read().clone();
                                let em = email.read().trim().to_string();
                                let pw = password.read().clone();
                                auth_error.set(None);
                                spawn(async move {
                                    let Some(pool) = p else {
                                        auth_error.set(Some("Database is not connected yet.".to_string()));
                                        return;
                                    };
                                    match AuthService::login(&pool, &em, &pw).await {
                                        Ok(u) => {
                                            let fresh = load_workspace_data(&pool, &u.id, u.study_streak).await;
                                            data_sig.set(fresh);
                                            user_sig.set(Some(u));
                                        }
                                        Err(e) => {
                                            auth_error.set(Some(e.to_string()));
                                        }
                                    }
                                });
                            },
                            "Sign In"
                        }
                    }
                }
            }
        }
    }
}
