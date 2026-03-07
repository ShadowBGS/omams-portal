# OMAMS Attendance Web Portal – Setup Guide

## Project Structure

```
web_portal/
├── index.html   # Single-page app (login + dashboard)
├── style.css    # Premium dark UI design
├── app.js       # Firebase auth + API logic
└── README.md    # This file
```

## Quick Start

### 1. Make sure your FastAPI backend is running
```powershell
cd backend
python -m app
```
The backend must be at `http://localhost:8000`.

### 2. Add `http://localhost:5500` to your backend CORS

Open `backend/.env` and add the live-server origin to `CORS_ORIGINS`:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500
```

### 3. Serve the web portal (pick any option)

**Option A – VS Code Live Server** (recommended)
- Install the "Live Server" extension in VS Code
- Right-click `web_portal/index.html` → **Open with Live Server**
- Opens at `http://127.0.0.1:5500/web_portal/index.html`

**Option B – Python HTTP server**
```powershell
cd web_portal
python -m http.server 5500
```
Then open `http://localhost:5500` in your browser.

**Option C – npx serve**
```powershell
cd web_portal
npx serve .
```

> ⚠️ Do **not** open `index.html` directly as a `file://` URL — Firebase Auth requires an `http://` origin.

## Features

### Students
| Feature | Description |
|---|---|
| 📋 My Attendance | Full session history with status (Present/Absent/Late) |
| 📊 Stats | Total sessions, present count, absent count, attendance rate |
| 🔍 Filter | Filter by course and/or status |
| ⬇ Export CSV | Download filtered attendance as CSV |
| 📚 My Courses | View all enrolled courses, click to filter attendance by course |

### Lecturers
| Feature | Description |
|---|---|
| 📚 Courses | View all your courses |
| 📅 Sessions | Click a course → see all sessions |
| 👥 Session Attendance | Click a session → see full attendance roster |
| ⬇ Export CSV | Download per-session attendance CSV |

## Supported Sign-In Methods

- **Email / Password** – Firebase email auth
- **Google** – One-click Google sign-in

> Users must already have an account in the app (registered via the Flutter app). New signups must use the Flutter app first.

## Backend URL

The backend URL is set in `app.js` line 11:
```js
const API_BASE = 'http://localhost:8000';
```
Change this to your deployed backend URL if needed (e.g. `https://your-app.onrender.com`).
