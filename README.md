# Todo API + Firebase Web App

Production-ready REST API built with FastAPI.

## Features

- User Registration
- JWT Authentication
- CRUD Todos
- Pagination
- Search / Filter / Sort
- SQLite Database

## Tech Stack

- FastAPI
- SQLAlchemy
- SQLite
- JWT
- Django local web shell
- Firebase Auth
- Firestore
- GitHub Pages static deploy

## Run Locally

```bash
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload
```

## Run the Firebase Web App with Django

The deployable app lives in `docs/` so GitHub Pages can serve it. Django is included as a local web shell for development.

```bash
python3 -m pip install -r requirements.txt
python3 manage.py runserver
```

Open `http://127.0.0.1:8000`.

## Firebase Setup

1. Create a Firebase project on the free Spark plan.
2. Enable Authentication providers:
   - Email/password
   - Google
3. Create a Firestore database.
4. Copy `docs/firebase-config.example.js` to `docs/firebase-config.js`.
5. Paste your web app Firebase config into `docs/firebase-config.js`.
6. Publish `firestore.rules` in Firebase Console > Firestore Database > Rules.
7. Add your GitHub Pages domain to Firebase Authentication > Settings > Authorized domains.

Firestore data is stored per user:

```text
users/{uid}/todos/{todoId}
users/{uid}/notes/{noteId}
```

Todo statuses are `do`, `did`, `done`, and `block`. Notes support tree hierarchy with a `parentId` field.

## Deploy to GitHub Pages

This repo includes `.github/workflows/pages.yml`. After pushing to `main`, enable GitHub Pages with **GitHub Actions** as the source in repository settings.

GitHub Pages serves only the static files in `docs/`. Django does not run on GitHub Pages; it is for local development.
