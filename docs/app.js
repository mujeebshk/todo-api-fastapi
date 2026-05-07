import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const statuses = [
  { id: "do", label: "Do", tone: "#2563eb" },
  { id: "did", label: "Did", tone: "#b45309" },
  { id: "done", label: "Done", tone: "#15803d" },
  { id: "block", label: "Block", tone: "#b91c1c" },
];

const config = window.TODO_FIREBASE_CONFIG || {};
const missingConfig = !config.apiKey || config.apiKey === "YOUR_API_KEY";
const dataMode = config.dataMode || "firestore";
const debugEnabled =
  new URLSearchParams(window.location.search).has("debug") ||
  localStorage.getItem("todoDebug") === "1";

const authPanel = document.querySelector("#authPanel");
const appPanel = document.querySelector("#appPanel");
const authForm = document.querySelector("#authForm");
const loginTab = document.querySelector("#loginTab");
const signupTab = document.querySelector("#signupTab");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const emailAuthButton = document.querySelector("#emailAuthButton");
const googleButton = document.querySelector("#googleButton");
const logoutButton = document.querySelector("#logoutButton");
const authMessage = document.querySelector("#authMessage");
const avatarButton = document.querySelector("#avatarButton");
const userAvatar = document.querySelector("#userAvatar");
const userInitials = document.querySelector("#userInitials");
const accountDropdown = document.querySelector("#accountDropdown");
const todoForm = document.querySelector("#todoForm");
const todoTitle = document.querySelector("#todoTitle");
const todoDetails = document.querySelector("#todoDetails");
const todoStatus = document.querySelector("#todoStatus");
const board = document.querySelector("#board");
const taskTemplate = document.querySelector("#taskTemplate");
const noteForm = document.querySelector("#noteForm");
const noteTitle = document.querySelector("#noteTitle");
const noteBody = document.querySelector("#noteBody");
const noteTree = document.querySelector("#noteTree");
const rootNoteButton = document.querySelector("#rootNoteButton");
const cancelNoteButton = document.querySelector("#cancelNoteButton");

let auth;
let db;
let activeUser = null;
let authMode = "login";
let todos = [];
let notes = [];
let editingNoteId = null;
let parentNoteId = null;
let unsubscribeTodos = null;
let unsubscribeNotes = null;

function debugLog(label, data = {}) {
  if (!debugEnabled) return;
  console.log(`[Todo Debug] ${label}`, data);
}

function debugError(label, error, data = {}) {
  console.error(`[Todo Debug] ${label}`, {
    ...data,
    name: error?.name,
    code: error?.code,
    message: error?.message,
    stack: error?.stack,
  });
}

function setMessage(message) {
  authMessage.textContent = message || "";
}

function setAuthMode(mode) {
  authMode = mode;
  loginTab.classList.toggle("is-active", mode === "login");
  signupTab.classList.toggle("is-active", mode === "signup");
  emailAuthButton.textContent = mode === "login" ? "Login" : "Create account";
  passwordInput.autocomplete =
    mode === "login" ? "current-password" : "new-password";
  setMessage("");
}

function getUserInitials(user) {
  const source = user?.displayName || user?.email || "User";
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

function closeAccountMenu() {
  accountDropdown.classList.add("is-hidden");
  avatarButton.setAttribute("aria-expanded", "false");
}

function updateUserAvatar(user) {
  userInitials.textContent = getUserInitials(user);

  if (user?.photoURL) {
    userAvatar.src = user.photoURL;
    userAvatar.classList.remove("is-hidden");
    userInitials.classList.add("is-hidden");
  } else {
    userAvatar.removeAttribute("src");
    userAvatar.classList.add("is-hidden");
    userInitials.classList.remove("is-hidden");
  }
}

async function apiCall(method, path, body = null) {
  if (!activeUser) {
    const error = new Error("No authenticated user is available");
    debugError("API skipped", error, { method, path });
    throw error;
  }

  if (!config.apiBaseUrl) {
    const error = new Error("Missing apiBaseUrl in Firebase config");
    debugError("API skipped", error, { method, path, config });
    throw error;
  }

  const url = `${config.apiBaseUrl.replace(/\/$/, "")}${path}`;
  const token = await activeUser.getIdToken();
  const requestId = crypto.randomUUID?.() || String(Date.now());
  const startedAt = performance.now();

  debugLog("API request", {
    requestId,
    method,
    path,
    url,
    hasToken: Boolean(token),
    uid: activeUser.uid,
    body,
  });

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : null,
    });
  } catch (error) {
    debugError("API network/CORS failure", error, {
      requestId,
      method,
      path,
      url,
      hint:
        "If this only happens after GitHub Pages deployment, check Render CORS ALLOWED_ORIGINS and that apiBaseUrl is reachable.",
    });
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  debugLog("API response", {
    requestId,
    method,
    path,
    url,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    durationMs: Math.round(performance.now() - startedAt),
    body: responseBody,
  });

  if (!response.ok) {
    const error = new Error(
      `API ${method} ${path} failed with ${response.status}`,
    );
    error.response = responseBody;
    error.status = response.status;
    throw error;
  }

  return responseBody;
}

function userCollection(name) {
  return collection(db, "users", activeUser.uid, name);
}

function userDoc(name, id) {
  return doc(db, "users", activeUser.uid, name, id);
}

async function createTodo(payload) {
  if (dataMode === "api") {
    return apiCall("POST", "/todos", payload);
  }

  return addDoc(userCollection("todos"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function updateTodo(todo, patch) {
  if (dataMode === "api") {
    return apiCall("PUT", `/todos/${todo.id}`, {
      ...todo,
      ...patch,
    });
  }

  return updateDoc(userDoc("todos", todo.id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

async function removeTodo(id) {
  if (dataMode === "api") {
    return apiCall("DELETE", `/todos/${id}`);
  }

  return deleteDoc(userDoc("todos", id));
}

async function createNote(payload) {
  if (dataMode === "api") {
    return apiCall("POST", "/notes", {
      title: payload.title,
      body: payload.body,
      parent_id: payload.parentId,
    });
  }

  return addDoc(userCollection("notes"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function updateNote(id, payload) {
  if (dataMode === "api") {
    return apiCall("PUT", `/notes/${id}`, {
      title: payload.title,
      body: payload.body,
    });
  }

  return updateDoc(userDoc("notes", id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

async function removeNote(id) {
  if (dataMode === "api") {
    return apiCall("DELETE", `/notes/${id}`);
  }

  return deleteDoc(userDoc("notes", id));
}

function normalizeFirestoreDoc(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

async function refreshFromApi() {
  const todoRes = await apiCall("GET", "/todos");
  todos = todoRes?.data || [];
  notes = (await apiCall("GET", "/notes")) || [];
  renderBoard();
  renderNotes();
}

async function refreshFromFirestore() {
  const [todoSnapshots, noteSnapshots] = await Promise.all([
    getDocs(query(userCollection("todos"), orderBy("createdAt", "desc"))),
    getDocs(query(userCollection("notes"), orderBy("createdAt", "desc"))),
  ]);

  todos = todoSnapshots.docs.map(normalizeFirestoreDoc);
  notes = noteSnapshots.docs.map(normalizeFirestoreDoc);
  renderBoard();
  renderNotes();
}

function subscribeToFirestoreData() {
  unsubscribeTodos?.();
  unsubscribeNotes?.();

  unsubscribeTodos = onSnapshot(
    query(userCollection("todos"), orderBy("createdAt", "desc")),
    (snapshot) => {
      todos = snapshot.docs.map(normalizeFirestoreDoc);
      debugLog("Firestore todos snapshot", { todoCount: todos.length });
      renderBoard();
    },
    (error) => {
      debugError("Firestore todos snapshot failed", error, {
        hint:
          "Check Firestore rules, Firebase projectId, and that Firestore Database is created.",
      });
      setMessage(formatError(error));
    },
  );

  unsubscribeNotes = onSnapshot(
    query(userCollection("notes"), orderBy("createdAt", "desc")),
    (snapshot) => {
      notes = snapshot.docs.map(normalizeFirestoreDoc);
      debugLog("Firestore notes snapshot", { noteCount: notes.length });
      renderNotes();
    },
    (error) => {
      debugError("Firestore notes snapshot failed", error, {
        hint:
          "Check Firestore rules, Firebase projectId, and that Firestore Database is created.",
      });
      setMessage(formatError(error));
    },
  );
}

function formatError(error) {
  const messages = {
    "auth/email-already-in-use":
      "This email already has an account. Use Login instead.",
    "auth/invalid-credential":
      "Invalid email or password. If this is a new email, select Sign up first.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/too-many-requests":
      "Too many attempts. Wait a moment, then try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/weak-password": "Use a password with at least 6 characters.",
  };

  if (error?.code && messages[error.code]) {
    return messages[error.code];
  }

  return (
    error?.message?.replace("Firebase: ", "").replace(/\.$/, "") ||
    "Something went wrong"
  );
}

function renderBoard() {
  board.innerHTML = "";

  statuses.forEach((status) => {
    const lane = document.createElement("section");
    lane.className = "lane";
    lane.style.borderTop = `4px solid ${status.tone}`;

    const laneTasks = todos.filter((todo) => todo.status === status.id);
    lane.innerHTML = `
      <h3>
        <span>${status.label}</span>
        <span class="lane-count">${laneTasks.length}</span>
      </h3>
    `;

    if (!laneTasks.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No tasks";
      lane.append(empty);
    }

    laneTasks.forEach((todo) => lane.append(renderTask(todo)));
    board.append(lane);
  });
}

function renderTask(todo) {
  const node = taskTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("h4").textContent = todo.title;
  node.querySelector("p").textContent = todo.details || "No details";

  const select = node.querySelector("select");
  select.value = todo.status;
  select.addEventListener("change", async () => {
    try {
      await updateTodo(todo, { status: select.value });
      await refreshData();
    } catch (error) {
      debugError("Update task failed", error, { id: todo.id });
      setMessage(formatError(error));
    }
  });

  node.querySelector("button").addEventListener("click", async () => {
    try {
      await removeTodo(todo.id);
      await refreshData();
    } catch (error) {
      debugError("Delete task failed", error, { id: todo.id });
      setMessage(formatError(error));
    }
  });

  return node;
}

function renderNotes() {
  noteTree.innerHTML = "";

  if (!notes.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No notes yet";
    noteTree.append(empty);
    return;
  }

  buildNoteBranch(null).forEach((node) => noteTree.append(node));
}

function buildNoteBranch(parentId) {
  return notes
    .filter((note) => (note.parentId || null) === parentId)
    .map((note) => {
      const wrapper = document.createElement("div");
      wrapper.className = "tree-node";

      const item = document.createElement("article");
      item.className = "tree-item";

      const title = document.createElement("div");
      title.className = "tree-title";
      title.innerHTML = `<strong></strong>`;
      title.querySelector("strong").textContent = note.title;

      const body = document.createElement("p");
      body.className = "tree-body";
      body.textContent = note.body || "";

      const tools = document.createElement("div");
      tools.className = "tree-tools";
      tools.append(
        noteButton("Child", () => startNote({ parentId: note.id })),
        noteButton("Edit", () => startNote({ note })),
        noteButton("Delete", async () => {
          try {
            await removeNote(note.id);
            await refreshData();
          } catch (error) {
            debugError("Delete note failed", error, { id: note.id });
            setMessage(formatError(error));
          }
        }),
      );

      item.append(title, body, tools);
      wrapper.append(item, ...buildNoteBranch(note.id));
      return wrapper;
    });
}

function noteButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function startNote({ note = null, parentId = null } = {}) {
  editingNoteId = note?.id || null;
  parentNoteId = note ? note.parentId || null : parentId;
  noteTitle.value = note?.title || "";
  noteBody.value = note?.body || "";
  noteTitle.focus();
}

function clearNoteForm() {
  editingNoteId = null;
  parentNoteId = null;
  noteForm.reset();
}

async function refreshData() {
  if (!activeUser) return;
  try {
    debugLog("Refresh started", {
      uid: activeUser.uid,
      email: activeUser.email,
      dataMode,
    });
    if (dataMode === "api") {
      await refreshFromApi();
    } else {
      await refreshFromFirestore();
    }
    debugLog("Refresh completed", {
      todoCount: todos.length,
      noteCount: notes.length,
    });
    renderBoard();
    renderNotes();
  } catch (error) {
    debugError("Refresh failed", error);
    setMessage(formatError(error));
  }
}

if (missingConfig) {
  debugError("Firebase config missing", new Error("Missing Firebase apiKey"), {
    config,
  });
  setMessage(
    "Add your Firebase values in docs/firebase-config.js before using the app.",
  );
} else {
  debugLog("Firebase init", {
    authDomain: config.authDomain,
    projectId: config.projectId,
    apiBaseUrl: config.apiBaseUrl,
    dataMode,
    host: window.location.host,
  });

  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    debugLog("Auth state changed", {
      signedIn: Boolean(user),
      uid: user?.uid,
      email: user?.email,
    });

    activeUser = user;
    authPanel.classList.toggle("is-hidden", Boolean(user));
    appPanel.classList.toggle("is-hidden", !user);
    updateUserAvatar(user);
    closeAccountMenu();

    if (user) {
      if (dataMode === "api") {
        refreshData();
      } else {
        subscribeToFirestoreData();
      }
    } else {
      unsubscribeTodos?.();
      unsubscribeNotes?.();
      unsubscribeTodos = null;
      unsubscribeNotes = null;
      todos = [];
      notes = [];
      renderBoard();
      renderNotes();
    }
  });
}

loginTab.addEventListener("click", () => setAuthMode("login"));
signupTab.addEventListener("click", () => setAuthMode("signup"));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (missingConfig) return;

  try {
    setMessage("");
    if (authMode === "login") {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value,
        passwordInput.value,
      );
    } else {
      await createUserWithEmailAndPassword(
        auth,
        emailInput.value,
        passwordInput.value,
      );
    }
    authForm.reset();
  } catch (error) {
    debugError("Email auth failed", error, {
      mode: authMode,
      email: emailInput.value,
    });
    setMessage(formatError(error));
  }
});

googleButton.addEventListener("click", async () => {
  if (missingConfig) return;

  try {
    setMessage("");
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    debugError("Google auth failed", error);
    setMessage(formatError(error));
  }
});

avatarButton.addEventListener("click", () => {
  const isOpen = !accountDropdown.classList.contains("is-hidden");
  accountDropdown.classList.toggle("is-hidden", isOpen);
  avatarButton.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".account-menu")) {
    closeAccountMenu();
  }
});

logoutButton.addEventListener("click", () => {
  closeAccountMenu();
  signOut(auth);
});

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeUser) return;

  const payload = {
    title: todoTitle.value.trim(),
    details: todoDetails.value.trim(),
    status: todoStatus.value,
  };

  debugLog("Add task submitted", payload);

  try {
    await createTodo(payload);
    await refreshData();
    todoForm.reset();
    debugLog("Add task completed");
  } catch (error) {
    debugError("Add task failed", error, { payload });
    setMessage(formatError(error));
  }
});

rootNoteButton.addEventListener("click", () => startNote());
cancelNoteButton.addEventListener("click", clearNoteForm);

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeUser) return;

  const payload = {
    title: noteTitle.value.trim(),
    body: noteBody.value.trim(),
    parentId: parentNoteId,
    updatedAt: serverTimestamp(),
  };

  if (editingNoteId) {
    await updateNote(editingNoteId, payload);
  } else {
    await createNote(payload);
  }

  await refreshData();
  clearNoteForm();
});

setAuthMode("login");
renderBoard();
renderNotes();
