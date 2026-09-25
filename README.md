# 🎓 UniManager - Student Operating System

> **An all-in-one university workspace & student operating system built to streamline coursework, notes, assignments, exam schedules, study habits, and AI-assisted learning.**

UniManager brings your entire academic life into a single, cohesive, private web application. Instead of scattering your lecture slides, assignment deadlines, revision notes, and study schedules across disparate tools, UniManager centralizes everything in a sleek, glassmorphic dashboard with offline-ready database persistence and multi-provider AI support.

---

## 🌟 What UniManager Can Do

UniManager is packed with specialized academic modules designed around how students actually study and manage coursework:

### 1. 📚 Coursework & Subject Management
- **Organize by Semester**: Group subjects by academic term or semester for clutter-free browsing.
- **Color-Coded Badges**: Assign custom color palettes to courses for visual identification across the platform.
- **Course Hub**: Drill into any subject to see all related lecture notes, upcoming assignments, syllabus resources, and scheduled calendar events in one place.

### 2. 📝 Advanced Note Taking & Knowledge Base
- **Rich Text & Markdown**: Take lecture notes with rich formatting, code blocks, lists, and headings.
- **Hierarchical Folder Structure**: Organize study notes into nested folders per subject, unit, or topic.
- **Fast Tagging System**: Tag notes with color-coded labels (e.g. `#exam-prep`, `#homework`, `#formula-sheet`).
- **File Attachments**: Upload and link lecture PDFs, assignment problem sets, and textbook diagrams directly to your notes.
- **Favorites & Pinned Notes**: Keep critical formulas and cheat sheets pinned to the top of your workspace.
- **Instant Search**: Search across your entire knowledge base by keyword, subject, or tag.

### 3. 📋 Assignment Tracker & Deadline Management
- **Priority Matrix**: Categorize assignments by urgency: `Low`, `Medium`, `High`, and `Urgent`.
- **Status Tracking**: Keep tabs on assignment lifecycles: `Pending`, `In Progress`, and `Completed`.
- **Subtask Breakdown**: Split daunting projects or lab reports into actionable subtasks with progress tracking.
- **Deadline Countdowns**: Visual time-left indicators and automated deadline reminders.

### 4. 🗂️ Kanban Planner & Time Blocking
- **Interactive Kanban Board**: Move daily study tasks through workflow columns (`Ideas`, `Planned`, `In Progress`, `Testing`, `Completed`).
- **Time Slot Allocation**: Schedule study sessions by time of day (`Morning`, `Afternoon`, `Night`).
- **Project & Assignment Linking**: Directly link tasks to high-level coursework or software engineering projects.

### 5. 📅 Academic Calendar & Exam Schedule
- **Multi-View Calendar**: Seamlessly switch between Day, Week, and Month perspectives.
- **Event Categorization**: Track lectures, lab sessions, exams, project milestones, and assignment due dates.
- **Color Coding**: Visual harmony with subject colors so you know what class an event belongs to at a glance.

### 6. 🚀 Projects & Portfolio Tracking
- **Course & Hackathon Projects**: Track group work, coding assignments, and semester research projects.
- **GitHub Integration**: Link GitHub repositories with built-in URL validation to jump straight to your code.
- **Progress Bars**: Dynamically calculate and display completion percentages as subtasks are marked done.

### 7. 🔥 Habit Tracking & Study Streaks
- **Daily & Weekly Habits**: Build consistent study routines (e.g., *"Review lecture slides"*, *"Solve 2 LeetCode problems"*, *"Read research paper"*).
- **Streak Calculation**: Automated streak counter that tracks daily consistency and celebrates your momentum.
- **One-Click Logging**: Quickly log habit completions straight from the dashboard or habit view.

### 8. 📊 Study Analytics & Performance Metrics
- **Workload Distribution**: Visual breakdown of assignments and tasks across subjects to avoid crunch time.
- **Completion Rates**: Monitor completion statistics over time.
- **Study Streak Visualizer**: Track active study streaks and activity history.

### 9. 🤖 AI Academic Assistant (Multi-Provider)
- **Flexible LLM Backend**: Use local or cloud AI models:
  - **Local & Private**: [Ollama](https://ollama.com) (`llama3`, `mistral`, `phi3`, etc.) or LM Studio.
  - **Cloud Providers**: Google Gemini, OpenAI (GPT-4o), Anthropic Claude, or DeepSeek.
- **Dedicated Student Tools**:
  - **Note Summarizer**: Condense lengthy lecture transcripts and readings into bulleted summaries.
  - **Exam & Quiz Generator**: Generate practice flashcards, multiple-choice questions, and sample exam prompts from your notes.
  - **Concept Explainer**: Request step-by-step breakdowns of difficult academic theorems, formulas, or code.
  - **Assignment Brainstormer**: Outline essay structures, project architectures, or research question angles.
  - **Free-form Study Chat**: Discuss coursework concepts conversationally.

### 10. 🔔 Smart Alerts & Notifications
- **Sound Chimes**: Subtle audio chimes when new alerts or assignment reminders trigger.
- **Browser Push Notifications**: Desktop alerts for upcoming deadlines even when browsing other tabs.
- **Notification Dropdown**: Centralized notification center with one-click mark-as-read and dismiss.

### 11. 💾 Complete Data Portability & Backups
- **One-Click JSON Export**: Download your complete university workspace (subjects, notes, assignments, tasks, calendar events, habits, and attachments) into a portable JSON backup.
- **Instant Restore**: Easily migrate or restore your workspace on any device with optimized bulk imports.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   UniManager Architecture                   │
└─────────────────────────────────────────────────────────────┘

 [ Frontend (Vite + React 18) ]
   ├── Tailwind CSS + Glassmorphism UI
   ├── Lucide Icons + Framer Motion Animations
   ├── TanStack Query (Server State Cache)
   ├── Zustand (Auth & UI State)
   └── Responsive Desktop & Mobile Layouts
              │
              │ REST API (/api/v1) + JWT Bearer Tokens
              ▼
 [ Backend (Node.js + Express + TypeScript) ]
   ├── Modular Service / Repository Pattern
   ├── Prisma ORM
   ├── Helmet & CORS Security Middlewares
   ├── Multer (Sanitized File Uploads)
   └── AI Multi-Provider Engine (Ollama / Gemini / OpenAI / Claude)
              │
              │ SQL Queries
              ▼
 [ Database (MySQL) ]
   └── Relational schema for Users, Subjects, Notes, Folders,
       Tags, Tasks, Assignments, Habits, Events, and AI Settings
```

---

## 📋 Prerequisites

Before running UniManager, ensure you have:

- **Node.js**: v18.0.0 or higher (tested on Node v20 LTS and v26)
- **npm**: v9.0.0 or higher
- **MySQL Server**: v8.0+ running locally or on a remote server
- **Ollama** *(Optional, for local AI)*: [Download Ollama](https://ollama.com) and run `ollama pull llama3`

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/satyam7545/unimanager.git
cd unimanager
```

### 2. Configure Environment Variables

#### Backend Configuration
Copy the template in `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and update your database credentials:
```env
PORT=5000
NODE_ENV=development

# MySQL connection string format:
# mysql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>
# Note: If your password contains special characters (like @, $, %), percent-encode them (@ -> %40)
DATABASE_URL="mysql://root:password@localhost:3306/unimanager"

JWT_ACCESS_SECRET="your_super_secret_access_key"
JWT_REFRESH_SECRET="your_super_secret_refresh_key"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

CLIENT_URL="http://localhost:5173"
```

#### Frontend Configuration (Optional)
If running frontend on a custom host or port, you can copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_URL="http://localhost:5000"
```

### 3. Install All Dependencies & Generate Prisma Client

Run the one-command installer from the workspace root:

```bash
npm run install:all
```

This installs all dependencies across the root, backend, and frontend packages, and generates the Prisma client bindings.

### 4. Initialize Database Schema

Push the Prisma schema to your MySQL database to create the necessary tables:

```bash
npm run prisma:push
```

*(Optional)* If you want to visually inspect or edit database tables in your browser:
```bash
npm run prisma:studio
```

### 5. Launch the Development Environment

Start both the backend server and frontend client concurrently:

```bash
npm run dev
```

- **Frontend**: Accessible at [http://localhost:5173](http://localhost:5173)
- **Backend API**: Accessible at [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Healthcheck**: Accessible at [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🤖 Configuring AI Assistance

UniManager can run completely offline with local AI or connect to top cloud providers:

### Option A: Local AI with Ollama (100% Private & Free)
1. Install [Ollama](https://ollama.com).
2. Start Ollama:
   ```bash
   ollama serve
   ```
3. Pull your preferred model (e.g. Llama 3 or Mistral):
   ```bash
   ollama pull llama3
   ```
4. In UniManager, navigate to **AI Assistant** ➔ Settings (gear icon) ➔ Select **Ollama** as the provider and ensure the endpoint points to `http://localhost:11434`.

### Option B: Cloud Models (Gemini, OpenAI, Claude, DeepSeek)
1. In UniManager, go to **AI Assistant** ➔ Settings.
2. Select your provider (**Google Gemini**, **OpenAI**, **Anthropic Claude**, or **DeepSeek**).
3. Paste your API key and select your preferred model.
4. Click **Save Settings**.

---

## 🧰 Available Scripts

From the repository root:

| Command | Description |
| :--- | :--- |
| `npm run install:all` | Installs root, backend, and frontend dependencies & generates Prisma client |
| `npm run dev` | Runs backend API & Vite frontend concurrently with colored terminal logs |
| `npm run dev:backend` | Starts only the backend with `ts-node-dev` hot-reloading |
| `npm run dev:frontend`| Starts only the Vite frontend dev server |
| `npm run build` | Compiles TypeScript for backend and builds the frontend production bundle |
| `npm run test` | Runs backend Jest unit tests |
| `npm run prisma:generate` | Regenerates Prisma TypeScript client |
| `npm run prisma:migrate` | Runs Prisma development migrations |
| `npm run prisma:push` | Pushes the schema state directly to the database |
| `npm run prisma:studio` | Opens Prisma Studio web UI for browsing database rows |

---

## 🔒 Security & Privacy Features

- **Sanitized Uploads**: Uploaded notes and assignments are assigned collision-resistant random hex identifiers, preventing directory traversal and file overwrite attacks.
- **Strict URL Validation**: Links (such as external project repos) enforce protocol validation to prevent `javascript:` XSS vectors.
- **Session Security**: JWT authentication pairs 15-minute access tokens with rotating HTTP-only refresh tokens stored in the database.
- **Local Data Control**: Your notes, assignments, and study habits stay on your personal database. When using Ollama, no study data ever leaves your computer.

---

## 📄 License

This project is created for personal and educational use. See repository license details for redistribution terms.
