use unimanager_core::{AppConfig, DashboardSummary};
use unimanager_db::models::{
    AISetting, Assignment, Conversation, Event, Habit, Note, Project, Subject, Task, User,
};
use unimanager_db::MySqlPool;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Route {
    Dashboard,
    Planner,
    Calendar,
    Subjects,
    Assignments,
    Notes,
    Projects,
    Habits,
    AIAssistant,
    Analytics,
    Profile,
    Settings,
}

impl Route {
    pub fn title(self) -> &'static str {
        match self {
            Route::Dashboard => "Dashboard",
            Route::Planner => "Planner",
            Route::Calendar => "Calendar",
            Route::Subjects => "Subjects",
            Route::Assignments => "Assignments",
            Route::Notes => "Notes",
            Route::Projects => "Projects",
            Route::Habits => "Habits",
            Route::AIAssistant => "AI Assistant",
            Route::Analytics => "Analytics",
            Route::Profile => "Profile",
            Route::Settings => "Settings",
        }
    }
}

#[derive(Clone, Default, PartialEq)]
pub struct WorkspaceData {
    pub subjects: Vec<Subject>,
    pub tasks: Vec<Task>,
    pub assignments: Vec<Assignment>,
    pub notes: Vec<Note>,
    pub projects: Vec<Project>,
    pub habits: Vec<Habit>,
    pub events: Vec<Event>,
    pub ai_setting: Option<AISetting>,
    pub conversations: Vec<Conversation>,
    pub summary: Option<DashboardSummary>,
}

#[derive(Clone)]
pub struct AppContext {
    pub config: AppConfig,
    pub pool: Option<MySqlPool>,
    pub user: Option<User>,
}
