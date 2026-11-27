use chrono::{Local, Utc};
use serde::{Deserialize, Serialize};
use unimanager_db::models::{Assignment, Event, Habit, Subject, Task};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PrioritizedTask {
    pub id: String,
    pub title: String,
    pub subject_name: Option<String>,
    pub subject_color: Option<String>,
    pub priority: String,
    pub score: i32,
    pub reason: String,
    pub estimated_minutes: i32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub study_streak: i32,
    pub pending_tasks_count: usize,
    pub todays_classes_count: usize,
    pub next_exam_days: Option<i64>,
    pub next_exam_title: Option<String>,
    pub what_to_work_on_now: Option<PrioritizedTask>,
    pub prioritized_tasks: Vec<PrioritizedTask>,
    pub overdue_assignments: Vec<Assignment>,
    pub weekly_workload_hours: f64,
    pub weekly_capacity_hours: f64,
}

pub struct DashboardEngine;

impl DashboardEngine {
    /// Computes deterministic priority scores and situational dashboard intelligence from live DB records.
    pub fn build_summary(
        study_streak: i32,
        subjects: &[Subject],
        tasks: &[Task],
        assignments: &[Assignment],
        events: &[Event],
        _habits: &[Habit],
    ) -> DashboardSummary {
        let now = Utc::now();
        let today_local = Local::now().date_naive();

        let mut scored_tasks: Vec<PrioritizedTask> = tasks
            .iter()
            .filter(|t| t.status != "DONE")
            .map(|t| {
                let mut score = match t.priority.as_str() {
                    "URGENT" => 100,
                    "HIGH" => 70,
                    "MEDIUM" => 40,
                    _ => 20,
                };
                let mut reason = format!("{} priority", t.priority);

                if let Some(d) = t.date {
                    let local_d = d.with_timezone(&Local).date_naive();
                    if local_d < today_local {
                        score += 50;
                        reason = "Overdue scheduled task".to_string();
                    } else if local_d == today_local {
                        score += 30;
                        reason = "Scheduled for today".to_string();
                    }
                }

                let subj = t
                    .subject_id
                    .as_ref()
                    .and_then(|sid| subjects.iter().find(|s| &s.id == sid));

                PrioritizedTask {
                    id: t.id.clone(),
                    title: t.title.clone(),
                    subject_name: subj.map(|s| s.name.clone()),
                    subject_color: subj.map(|s| s.color.clone()),
                    priority: t.priority.clone(),
                    score,
                    reason,
                    estimated_minutes: t.estimated_minutes.unwrap_or(25),
                }
            })
            .collect();

        scored_tasks.sort_by(|a, b| b.score.cmp(&a.score));

        let todays_classes_count = events
            .iter()
            .filter(|e| {
                e.event_type == "CLASS"
                    && e.start_at.with_timezone(&Local).date_naive() == today_local
            })
            .count();

        let next_exam = events
            .iter()
            .filter(|e| e.event_type == "EXAM" && e.start_at >= now)
            .min_by_key(|e| e.start_at);

        let overdue_assignments: Vec<Assignment> = assignments
            .iter()
            .filter(|a| a.status != "COMPLETED" && a.deadline < now)
            .cloned()
            .collect();

        let task_hours: f64 = tasks
            .iter()
            .filter(|t| t.status != "DONE")
            .map(|t| t.estimated_minutes.unwrap_or(30) as f64 / 60.0)
            .sum();
        let assignment_hours: f64 = assignments
            .iter()
            .filter(|a| a.status != "COMPLETED")
            .map(|a| a.estimated_hours.unwrap_or(2.0))
            .sum();

        DashboardSummary {
            study_streak,
            pending_tasks_count: scored_tasks.len(),
            todays_classes_count,
            next_exam_days: next_exam.map(|e| (e.start_at - now).num_days().max(0)),
            next_exam_title: next_exam.map(|e| e.title.clone()),
            what_to_work_on_now: scored_tasks.first().cloned(),
            prioritized_tasks: scored_tasks,
            overdue_assignments,
            weekly_workload_hours: ((task_hours + assignment_hours) * 10.0).round() / 10.0,
            weekly_capacity_hours: 40.0,
        }
    }
}
