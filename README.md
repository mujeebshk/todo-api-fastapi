# Todo Workspace

Todo Workspace is a simple task and notes app. You can create tasks, move them between statuses, and save notes in a tree structure.

Live app:

```text
https://mujeebshk.github.io/todo-api-fastapi/
```

API docs:

```text
https://todo-api-fastapi-12mh.onrender.com/docs
```

## What This Project Does

- Users can sign up and log in.
- Users can add, update, and delete tasks.
- Tasks are grouped by status:
  - Do
  - Did
  - Done
  - Block
- Users can create notes.
- Notes can have child notes.
- Each user sees only their own tasks and notes.

## Tech Used

- **HTML** - markup language used to build the page structure.
- **CSS** - styling language used to design the app layout and look.
- **JavaScript** - programming language used for frontend app logic.
- **Python** - programming language used for the backend API.
- **FastAPI** - Python web framework used to build API routes.
- **SQL** - database query language used through the backend database layer.
- **SQLite** - lightweight database used by the backend for local/API storage.
- **SQLAlchemy** - Python ORM tool used to work with database models.
- **Firebase Authentication** - authentication platform used for login and signup.
- **Firebase Firestore** - cloud NoSQL database used to store tasks and notes.
- **Render** - cloud hosting platform used to run the FastAPI backend.
- **GitHub Pages** - static hosting platform used to publish the frontend.
- **GitHub Actions** - automation tool used to deploy the frontend.
- **Uvicorn** - Python ASGI server used to run the FastAPI app.
- **python-jose** - Python library used for JWT token handling.
- **Passlib bcrypt** - Python library used for password hashing.

## Simple Architecture

```text
User
  |
  v
GitHub Pages frontend
  |
  |-- Firebase Auth: login/signup
  |
  |-- Firestore: save tasks and notes
  |
  |-- Render FastAPI API: optional backend API
```

The current frontend uses Firestore by default:

```js
dataMode: "firestore"
```

This means tasks and notes are saved in Firebase, not in Render.

If you want the frontend to use the Render API instead, change this in `docs/firebase-config.js`:

```js
dataMode: "api"
```

## How Data Is Stored

Firestore stores each user's data like this:

```text
users/{userId}/todos/{todoId}
users/{userId}/notes/{noteId}
```

Example:

```text
users/abc123/todos/task1
users/abc123/notes/note1
```

## How To Use The Live App

1. Open the live app:

   ```text
   https://mujeebshk.github.io/todo-api-fastapi/
   ```

2. Sign up with email/password or continue with Google.

3. Add a task using the task form.

4. Choose a task status:
   - Do
   - Did
   - Done
   - Block

5. Use the status dropdown on a task to move it.

6. Use the notes panel to create notes or child notes.

## Run On Local Machine

### 1. Clone The Project

```bash
git clone https://github.com/mujeebshk/todo-api-fastapi.git
cd todo-api-fastapi
```

### 2. Create A Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

On Windows:

```bash
venv\Scripts\activate
```

### 3. Install Python Packages

```bash
pip install -r requirements.txt
```

### 4. Add Backend Environment Variables

Create a `.env` file in the project root:

```text
SECRET_KEY=your-secret-key
ALGORITHM=HS256
FIREBASE_PROJECT_ID=your-firebase-project-id
ALLOWED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000
```

### 5. Run The FastAPI Backend

```bash
uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

### 6. Run The Frontend Locally

The frontend files are inside `docs/`.

You can use Python's simple static server:

```bash
cd docs
python3 -m http.server 5500
```

Open:

```text
http://127.0.0.1:5500
```

## Firebase Setup For New Users

1. Create a Firebase project.
2. Enable Authentication.
3. Enable Email/password login.
4. Enable Google login if you want Google sign-in.
5. Create a Firestore Database.
6. Copy your Firebase web config.
7. Put the values in `docs/firebase-config.js`.
8. Publish `firestore.rules` in Firebase Console.
9. Add your local and live domains in Firebase Authentication authorized domains.

Useful authorized domains:

```text
localhost
127.0.0.1
mujeebshk.github.io
```

## Render Setup

Render is used to host the FastAPI backend.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required Render environment variables:

```text
SECRET_KEY=your-secret-key
ALGORITHM=HS256
FIREBASE_PROJECT_ID=your-firebase-project-id
ALLOWED_ORIGINS=https://mujeebshk.github.io,http://localhost:5500,http://127.0.0.1:5500
```

## Important Files

- `docs/index.html` - frontend page
- `docs/app.js` - frontend app logic
- `docs/firebase-config.js` - Firebase and storage config
- `firestore.rules` - Firestore security rules
- `app/main.py` - FastAPI app entry point
- `app/auth.py` - authentication helpers
- `app/routes/todos.py` - todo API routes
- `app/routes/notes.py` - notes API routes
- `app/models.py` - database models
- `requirements.txt` - Python packages
- `render.yaml` - Render deployment config

## Debugging

Open the app with `?debug`:

```text
https://mujeebshk.github.io/todo-api-fastapi/?debug
```

Then open the browser console.

You will see logs starting with:

```text
[Todo Debug]
```

These logs help check:

- Firebase config
- Login state
- Firestore reads and writes
- API requests
- API errors
- CORS problems

## Notes

- Do not push `.env`.
- Do not push `todo.db`.
- Do not push `venv/`.
- `requirements.txt` is safe to push.
- Firebase API key is not a private password, but Firebase rules must be correct.
