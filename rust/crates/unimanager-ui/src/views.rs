use chrono::{Local, Timelike, Utc};
use dioxus::prelude::*;
use pulldown_cmark::{html, Options, Parser};
use unimanager_ai::{AiClient, ChatTurn};
use unimanager_db::repositories::academic_repo::AcademicRepository;
use unimanager_db::repositories::planner_repo::PlannerRepository;
use unimanager_db::MySqlPool;

use crate::state::WorkspaceData;

fn greeting() -> &'static str {
    let h = Local::now().hour();
    if h < 12 {
        "Good morning"
    } else if h < 18 {
        "Good afternoon"
    } else {
        "Good evening"
    }
}

#[component]
pub fn DashboardView(
    user_name: String,
    user_id: String,
    data: WorkspaceData,
    on_refresh: EventHandler<()>,
) -> Element {
    let pool_sig = use_context::<Signal<Option<MySqlPool>>>();
    let summary = data.summary.clone();
    let streak = summary.as_ref().map(|s| s.study_streak).unwrap_or(0);
    let pending = summary.as_ref().map(|s| s.pending_tasks_count).unwrap_or(0);
    let classes = summary.as_ref().map(|s| s.todays_classes_count).unwrap_or(0);
    let next_exam = summary
        .as_ref()
        .and_then(|s| s.next_exam_days.map(|d| format!("{d}d away")))
        .unwrap_or_else(|| "All clear".to_string());
    let next_exam_label = summary
        .as_ref()
        .and_then(|s| s.next_exam_title.clone())
        .unwrap_or_else(|| "No upcoming exam alerts".to_string());

    let focus_item = summary.as_ref().and_then(|s| s.what_to_work_on_now.clone());
    let tasks = summary
        .as_ref()
        .map(|s| s.prioritized_tasks.clone())
        .unwrap_or_default();

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 20px;",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                div {
                    h2 { style: "margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;",
                        "{greeting()}, {user_name}"
                    }
                    p { style: "margin: 4px 0 0; font-size: 12px; color: var(--muted);",
                        "{Local::now().format(\"%A, %B %e\")} · {classes} classes today · {pending} action items"
                    }
                }
                span { class: "pill", style: "background: rgba(245,158,11,0.12); color: var(--amber); border: 1px solid rgba(245,158,11,0.3);",
                    "{streak}d streak"
                }
            }

            div { class: "stats-grid",
                div { class: "glass-card",
                    div { style: "font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;", "Streak" }
                    div { style: "font-size: 24px; font-weight: 800; margin-top: 8px; color: var(--amber);", "{streak} days" }
                    div { style: "font-size: 11px; color: var(--muted); margin-top: 2px;", "Daily study record" }
                }
                div { class: "glass-card",
                    div { style: "font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;", "Priority Tasks" }
                    div { style: "font-size: 24px; font-weight: 800; margin-top: 8px; color: var(--primary);", "{pending}" }
                    div { style: "font-size: 11px; color: var(--muted); margin-top: 2px;", "Intelligent queue" }
                }
                div { class: "glass-card",
                    div { style: "font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;", "Today's Classes" }
                    div { style: "font-size: 24px; font-weight: 800; margin-top: 8px; color: var(--emerald);", "{classes}" }
                    div { style: "font-size: 11px; color: var(--muted); margin-top: 2px;", "Scheduled sessions" }
                }
                div { class: "glass-card",
                    div { style: "font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700;", "Next Exam" }
                    div { style: "font-size: 24px; font-weight: 800; margin-top: 8px; color: var(--rose);", "{next_exam}" }
                    div { style: "font-size: 11px; color: var(--muted); margin-top: 2px;", "{next_exam_label}" }
                }
            }

            if let Some(rec) = focus_item {
                div { class: "glass-card", style: "border-color: rgba(99,102,241,0.35); background: linear-gradient(135deg, rgba(99,102,241,0.12), var(--surface));",
                    div { style: "display: flex; justify-content: space-between; align-items: center; gap: 16px;",
                        div {
                            span { class: "pill", style: "background: rgba(99,102,241,0.2); color: var(--primary);", "What to work on right now" }
                            h3 { style: "margin: 10px 0 6px; font-size: 20px; font-weight: 800;", "{rec.title}" }
                            p { style: "margin: 0; font-size: 13px; color: var(--muted);", "{rec.reason} · {rec.estimated_minutes} min recommended" }
                        }
                        button {
                            class: "btn-primary",
                            onclick: {
                                let uid = user_id.clone();
                                let tid = rec.id.clone();
                                move |_| {
                                    let p = pool_sig.read().clone();
                                    let uid = uid.clone();
                                    let tid = tid.clone();
                                    spawn(async move {
                                        if let Some(pool) = p {
                                            let _ = PlannerRepository::update_task_status(&pool, &uid, &tid, "DONE").await;
                                            on_refresh.call(());
                                        }
                                    });
                                }
                            },
                            "Mark Complete"
                        }
                    }
                }
            }

            div { class: "glass-card",
                h3 { style: "margin: 0 0 12px; font-size: 15px; font-weight: 700;", "Intelligent Priority Queue" }
                if tasks.is_empty() {
                    p { style: "color: var(--muted); font-size: 13px;", "No pending tasks. Add one in Planner!" }
                } else {
                    div { style: "display: flex; flex-direction: column; gap: 8px;",
                        for task in tasks.into_iter().take(8) {
                            div { key: "{task.id}", style: "display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border);",
                                div {
                                    div { style: "font-size: 13px; font-weight: 600;", "{task.title}" }
                                    div { style: "font-size: 11px; color: var(--muted); margin-top: 2px;", "{task.priority} · {task.reason}" }
                                }
                                span { class: "pill", style: "background: rgba(99,102,241,0.15); color: var(--primary);", "Score {task.score}" }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn PlannerView(
    user_id: String,
    data: WorkspaceData,
    on_refresh: EventHandler<()>,
) -> Element {
    let pool_sig = use_context::<Signal<Option<MySqlPool>>>();
    let morning_input = use_signal(String::new);
    let afternoon_input = use_signal(String::new);
    let night_input = use_signal(String::new);

    let total = data.tasks.len();
    let done = data.tasks.iter().filter(|t| t.status == "DONE").count();
    let pct = if total > 0 { (done * 100) / total } else { 0 };

    let slots = [("MORNING", "Morning", morning_input), ("AFTERNOON", "Afternoon", afternoon_input), ("NIGHT", "Night", night_input)];

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 18px;",
            div { class: "glass-card", style: "display: flex; justify-content: space-between; align-items: center;",
                div {
                    div { style: "font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase;", "Day Progress" }
                    div { style: "font-size: 16px; font-weight: 700; margin-top: 4px;", "{done} of {total} tasks completed ({pct}%)" }
                }
                div { style: "width: 240px; height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden;",
                    div { style: "width: {pct}%; height: 100%; background: var(--primary);" }
                }
            }

            div { style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;",
                for (slot_key, label, mut sig) in slots {
                    div { key: "{slot_key}", class: "glass-card", style: "display: flex; flex-direction: column; gap: 12px;",
                        div { style: "font-weight: 700; font-size: 14px; border-bottom: 1px solid var(--border); padding-bottom: 8px;", "{label}" }
                        div { style: "display: flex; gap: 8px;",
                            input {
                                class: "input-field",
                                placeholder: "Quick add task...",
                                value: "{sig}",
                                oninput: move |evt| sig.set(evt.value()),
                            }
                            button {
                                class: "btn-primary",
                                onclick: {
                                    let uid = user_id.clone();
                                    move |_| {
                                        let title = sig.read().trim().to_string();
                                        if title.is_empty() { return; }
                                        sig.set(String::new());
                                        let p = pool_sig.read().clone();
                                        let uid = uid.clone();
                                        spawn(async move {
                                            if let Some(pool) = p {
                                                let _ = PlannerRepository::create_task(&pool, &uid, &title, "MEDIUM", Some(Utc::now()), Some(slot_key), None, None, Some(30)).await;
                                                on_refresh.call(());
                                            }
                                        });
                                    }
                                },
                                "+"
                            }
                        }
                        div { style: "display: flex; flex-direction: column; gap: 8px;",
                            for task in data.tasks.iter().filter(|t| t.time_slot.as_deref().unwrap_or("AFTERNOON") == slot_key).cloned() {
                                div { key: "{task.id}", style: "display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border);",
                                    span {
                                        style: if task.status == "DONE" { "font-size: 13px; text-decoration: line-through; color: var(--muted); cursor: pointer;" } else { "font-size: 13px; cursor: pointer;" },
                                        onclick: {
                                            let uid = user_id.clone();
                                            let tid = task.id.clone();
                                            let next = if task.status == "DONE" { "TODO" } else { "DONE" };
                                            move |_| {
                                                let p = pool_sig.read().clone();
                                                let uid = uid.clone();
                                                let tid = tid.clone();
                                                spawn(async move {
                                                    if let Some(pool) = p {
                                                        let _ = PlannerRepository::update_task_status(&pool, &uid, &tid, next).await;
                                                        on_refresh.call(());
                                                    }
                                                });
                                            }
                                        },
                                        "{task.title}"
                                    }
                                    button {
                                        class: "btn-secondary",
                                        style: "padding: 4px 8px; font-size: 11px;",
                                        onclick: {
                                            let uid = user_id.clone();
                                            let tid = task.id.clone();
                                            move |_| {
                                                let p = pool_sig.read().clone();
                                                let uid = uid.clone();
                                                let tid = tid.clone();
                                                spawn(async move {
                                                    if let Some(pool) = p {
                                                        let _ = PlannerRepository::delete_task(&pool, &uid, &tid).await;
                                                        on_refresh.call(());
                                                    }
                                                });
                                            }
                                        },
                                        "Del"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn SubjectsView(
    user_id: String,
    data: WorkspaceData,
    on_refresh: EventHandler<()>,
) -> Element {
    let pool_sig = use_context::<Signal<Option<MySqlPool>>>();
    let mut name = use_signal(String::new);
    let mut color = use_signal(|| "#6366F1".to_string());

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 18px;",
            div { class: "glass-card", style: "display: flex; gap: 10px; align-items: center;",
                input {
                    class: "input-field",
                    placeholder: "New subject name (e.g., Operating Systems)",
                    value: "{name}",
                    oninput: move |e| name.set(e.value()),
                }
                input {
                    r#type: "color",
                    value: "{color}",
                    oninput: move |e| color.set(e.value()),
                    style: "width: 44px; height: 38px; border: none; background: transparent; cursor: pointer;",
                }
                button {
                    class: "btn-primary",
                    onclick: {
                        let uid = user_id.clone();
                        move |_| {
                            let n = name.read().trim().to_string();
                            if n.is_empty() { return; }
                            let c = color.read().clone();
                            name.set(String::new());
                            let p = pool_sig.read().clone();
                            let uid = uid.clone();
                            spawn(async move {
                                if let Some(pool) = p {
                                    let _ = AcademicRepository::create_subject(&pool, &uid, &n, &c, None).await;
                                    on_refresh.call(());
                                }
                            });
                        }
                    },
                    "Add Subject"
                }
            }

            div { style: "display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px;",
                for subj in data.subjects.clone() {
                    div { key: "{subj.id}", class: "glass-card", style: "border-left: 4px solid {subj.color}; display: flex; justify-content: space-between; align-items: center;",
                        div {
                            div { style: "font-weight: 700; font-size: 15px;", "{subj.name}" }
                            div { style: "font-size: 11px; color: var(--muted); margin-top: 4px;",
                                {subj.semester.as_deref().unwrap_or("All Semesters")}
                            }
                        }
                        button {
                            class: "btn-secondary",
                            style: "padding: 4px 10px; font-size: 11px;",
                            onclick: {
                                let uid = user_id.clone();
                                let sid = subj.id.clone();
                                move |_| {
                                    let p = pool_sig.read().clone();
                                    let uid = uid.clone();
                                    let sid = sid.clone();
                                    spawn(async move {
                                        if let Some(pool) = p {
                                            let _ = AcademicRepository::delete_subject(&pool, &uid, &sid).await;
                                            on_refresh.call(());
                                        }
                                    });
                                }
                            },
                            "Delete"
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn AssignmentsView(
    user_id: String,
    data: WorkspaceData,
    on_refresh: EventHandler<()>,
) -> Element {
    let pool_sig = use_context::<Signal<Option<MySqlPool>>>();
    let mut title = use_signal(String::new);

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 16px;",
            div { class: "glass-card", style: "display: flex; gap: 10px;",
                input {
                    class: "input-field",
                    placeholder: "New assignment title...",
                    value: "{title}",
                    oninput: move |e| title.set(e.value()),
                }
                button {
                    class: "btn-primary",
                    onclick: {
                        let uid = user_id.clone();
                        move |_| {
                            let t = title.read().trim().to_string();
                            if t.is_empty() { return; }
                            title.set(String::new());
                            let p = pool_sig.read().clone();
                            let uid = uid.clone();
                            spawn(async move {
                                if let Some(pool) = p {
                                    let deadline = Utc::now() + chrono::Duration::days(7);
                                    let _ = AcademicRepository::create_assignment(&pool, &uid, &t, None, "MEDIUM", deadline, 2.0, None, None).await;
                                    on_refresh.call(());
                                }
                            });
                        }
                    },
                    "Add Assignment"
                }
            }

            for ass in data.assignments.clone() {
                div { key: "{ass.id}", class: "glass-card", style: "display: flex; justify-content: space-between; align-items: center;",
                    div {
                        div {
                            style: if ass.status == "COMPLETED" { "font-weight: 700; text-decoration: line-through; color: var(--muted);" } else { "font-weight: 700;" },
                            "{ass.title}"
                        }
                        div { style: "font-size: 11px; color: var(--muted); margin-top: 4px;",
                            "{ass.priority} · {ass.status} · Due {ass.deadline.format(\"%Y-%m-%d\")}"
                        }
                    }
                    div { style: "display: flex; gap: 8px;",
                        button {
                            class: "btn-secondary",
                            onclick: {
                                let uid = user_id.clone();
                                let aid = ass.id.clone();
                                let next = if ass.status == "COMPLETED" { "PENDING" } else { "COMPLETED" };
                                move |_| {
                                    let p = pool_sig.read().clone();
                                    let uid = uid.clone();
                                    let aid = aid.clone();
                                    spawn(async move {
                                        if let Some(pool) = p {
                                            let _ = AcademicRepository::update_assignment_status(&pool, &uid, &aid, next).await;
                                            on_refresh.call(());
                                        }
                                    });
                                }
                            },
                            if ass.status == "COMPLETED" { "Reopen" } else { "Complete" }
                        }
                        button {
                            class: "btn-secondary",
                            onclick: {
                                let uid = user_id.clone();
                                let aid = ass.id.clone();
                                move |_| {
                                    let p = pool_sig.read().clone();
                                    let uid = uid.clone();
                                    let aid = aid.clone();
                                    spawn(async move {
                                        if let Some(pool) = p {
                                            let _ = AcademicRepository::delete_assignment(&pool, &uid, &aid).await;
                                            on_refresh.call(());
                                        }
                                    });
                                }
                            },
                            "Delete"
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn NotesView(
    user_id: String,
    data: WorkspaceData,
    on_refresh: EventHandler<()>,
) -> Element {
    let pool_sig = use_context::<Signal<Option<MySqlPool>>>();
    let mut selected_id = use_signal(|| data.notes.first().map(|n| n.id.clone()));
    let mut new_title = use_signal(String::new);

    let active_note = selected_id
        .read()
        .as_ref()
        .and_then(|id| data.notes.iter().find(|n| &n.id == id))
        .cloned();

    let rendered_html = active_note.as_ref().map(|note| {
        let parser = Parser::new_ext(&note.content, Options::all());
        let mut html_out = String::new();
        html::push_html(&mut html_out, parser);
        html_out
    });

    rsx! {
        div { style: "display: grid; grid-template-columns: 280px 1fr; gap: 18px; height: 100%;",
            div { class: "glass-card", style: "display: flex; flex-direction: column; gap: 10px;",
                div { style: "display: flex; gap: 6px;",
                    input {
                        class: "input-field",
                        placeholder: "New note title...",
                        value: "{new_title}",
                        oninput: move |e| new_title.set(e.value()),
                    }
                    button {
                        class: "btn-primary",
                        onclick: {
                            let uid = user_id.clone();
                            move |_| {
                                let t = new_title.read().trim().to_string();
                                if t.is_empty() { return; }
                                new_title.set(String::new());
                                let p = pool_sig.read().clone();
                                let uid = uid.clone();
                                spawn(async move {
                                    if let Some(pool) = p {
                                        if let Ok(note) = AcademicRepository::create_note(&pool, &uid, &t, "# New Note\n\nStart writing...", None, None, None).await {
                                            selected_id.set(Some(note.id));
                                            on_refresh.call(());
                                        }
                                    }
                                });
                            }
                        },
                        "+"
                    }
                }
                for note in data.notes.clone() {
                    {
                        let nid = note.id.clone();
                        let nid_click = note.id.clone();
                        let is_selected = selected_id.read().as_deref() == Some(nid.as_str());
                        rsx! {
                            button {
                                key: "{nid}",
                                class: if is_selected { "nav-btn active" } else { "nav-btn" },
                                onclick: move |_| selected_id.set(Some(nid_click.clone())),
                                "{note.title}"
                            }
                        }
                    }
                }
            }

            div { class: "glass-card", style: "overflow-y: auto;",
                if let (Some(note), Some(html_body)) = (active_note, rendered_html) {
                    h2 { style: "margin-top: 0;", "{note.title}" }
                    div { dangerous_inner_html: "{html_body}" }
                } else {
                    p { style: "color: var(--muted);", "Select or create a note to view rendered Markdown." }
                }
            }
        }
    }
}

#[component]
pub fn AIAssistantView(data: WorkspaceData) -> Element {
    let mut prompt = use_signal(String::new);
    let mut reply = use_signal(|| "Ask anything about your courses, notes, or study schedule.".to_string());
    let mut loading = use_signal(|| false);

    let setting = data.ai_setting.clone();

    rsx! {
        div { class: "glass-card", style: "display: flex; flex-direction: column; gap: 14px;",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                h3 { style: "margin: 0;", "Rust Native AI Assistant" }
                span { class: "pill", style: "background: rgba(99,102,241,0.15); color: var(--primary);",
                    {setting.as_ref().map(|s| s.provider.as_str()).unwrap_or("Not Configured")}
                }
            }
            div { style: "min-height: 220px; padding: 14px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); white-space: pre-wrap; font-size: 13px; line-height: 1.6;",
                "{reply}"
            }
            div { style: "display: flex; gap: 10px;",
                input {
                    class: "input-field",
                    placeholder: "Ask UniManager AI...",
                    value: "{prompt}",
                    oninput: move |e| prompt.set(e.value()),
                }
                button {
                    class: "btn-primary",
                    disabled: *loading.read(),
                    onclick: move |_| {
                        let q = prompt.read().trim().to_string();
                        if q.is_empty() { return; }
                        let Some(cfg) = setting.clone() else {
                            reply.set("No AISetting row found in database for this user.".to_string());
                            return;
                        };
                        prompt.set(String::new());
                        loading.set(true);
                        spawn(async move {
                            let client = AiClient::new();
                            let req = AiClient::request_from_setting(&cfg, vec![ChatTurn { role: "user".to_string(), content: q }]);
                            match client.complete(&req).await {
                                Ok(ans) => reply.set(ans),
                                Err(err) => reply.set(format!("AI error: {err}")),
                            }
                            loading.set(false);
                        });
                    },
                    if *loading.read() { "Thinking..." } else { "Send" }
                }
            }
        }
    }
}
