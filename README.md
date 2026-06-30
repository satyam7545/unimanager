# 🎓 UniManager

> A personal university management system built to organize notes, assignments, and study materials with optional AI assistance powered by Ollama.

## 📖 About

UniManager is a personal project I created to help manage my university life in one place. Instead of keeping notes, assignments, and resources scattered across multiple applications, UniManager brings everything together into a single web application.

The project uses **MySQL** for data storage and **Ollama** to provide AI-powered assistance for studying, note organization, and assignment help while keeping everything running locally.

Although I built this primarily for myself, anyone is welcome to use, modify, or improve it.

---

## ✨ Features

* 📚 Organize notes by subject
* 📝 Manage assignments
* 🤖 AI assistance using Ollama
* 💾 MySQL database support
* 🌐 Responsive web interface
* 🔒 Self-hosted and privacy-friendly
* ⚡ Simple deployment using Node.js and PM2

---

## 🛠️ Tech Stack

### Frontend

* React
* Node.js
* npm

### Backend

* Node.js
* Express.js

### Database

* MySQL

### AI

* Ollama (Local LLM Support)

---

## 📋 Requirements

Before running the project, make sure you have:

* Node.js (Latest LTS recommended)
* npm
* MySQL Server
* Ollama installed and running
* PM2 (optional but recommended)

Install PM2 globally:

```bash
npm install -g pm2
```

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/unimanager.git

cd unimanager
```

### 2. Install dependencies

Frontend

```bash
cd frontend
npm install
```

Backend

```bash
cd ../backend
npm install
```

### 3. Configure the database

Create a MySQL database and update your environment variables or configuration file with your MySQL credentials.

Example:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=unimanager
DB_USER=root
DB_PASSWORD=yourpassword
```

### 4. Start Ollama

Ensure Ollama is installed and running before starting the backend.

Example:

```bash
ollama serve
```

Pull any model you want to use, for example:

```bash
ollama pull llama3
```

---

## ▶️ Running the Project

### Development

Frontend

```bash
npm run dev
```

Backend

```bash
npm run dev
```

### Production (PM2)

Frontend

```bash
pm2 start npm --name unimanager-frontend -- run start
```

Backend

```bash
pm2 start npm --name unimanager-backend -- run start
```

---

## 🤖 AI Integration

UniManager uses **Ollama** for local AI capabilities.

Depending on your configuration, AI can help with:

* Summarizing notes
* Explaining difficult topics
* Brainstorming assignments
* Improving written content
* General study assistance

Since everything runs locally through Ollama, your data stays on your own machine.

---

## 📌 Project Status

This is an active personal project and is still under development.

Expect:

* New features
* UI improvements
* Bug fixes
* Occasional breaking changes

---

## 🤝 Contributing

Contributions, ideas, and suggestions are always welcome.

If you discover a bug or have a feature request, please open an Issue or submit a Pull Request.

---

## ⚠️ Disclaimer

This project was built primarily for personal use.

While I try to keep the project stable, I **cannot guarantee** that it is free from bugs, security issues, or unexpected behavior.

By using this software, you agree that:

* You are responsible for reviewing the code before deploying it.
* You use the software entirely at your own risk.
* I am **not responsible** for any data loss, security vulnerabilities, hardware damage, software issues, or any other problems resulting from its use.

Please do **not** use this project in production environments without performing your own security review.

---

## 🐞 Reporting Bugs

If you find:

* Bugs
* Security issues
* Performance problems
* Broken features

please create an Issue describing the problem.

I'll do my best to fix it whenever I have the time.

---

## 📄 License

This project is currently provided as-is.

No warranty is provided.

Please check the repository's LICENSE file if one has been added.

---

## ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.

It helps others discover the project and motivates me to continue improving it.
