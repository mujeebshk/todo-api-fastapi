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
  if (!missingConfig) {
    setMessage("");
  }
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

function getUserPhotoUrl(user) {
  return (
    user?.photoURL ||
    user?.providerData?.find((provider) => provider.photoURL)?.photoURL ||
    ""
  );
}

function showAvatarInitials() {
  userAvatar.removeAttribute("src");
  userAvatar.classList.add("is-hidden");
  userInitials.classList.remove("is-hidden");
}

function updateUserAvatar(user) {
  userInitials.textContent = getUserInitials(user);
  userAvatar.onerror = showAvatarInitials;

  const photoUrl = getUserPhotoUrl(user);

  if (photoUrl) {
    userAvatar.src = photoUrl;
    userAvatar.classList.remove("is-hidden");
    userInitials.classList.add("is-hidden");
  } else {
    showAvatarInitials();
  }
}

function closeAccountMenu() {
  accountDropdown.classList.add("is-hidden");
  avatarButton.setAttribute("aria-expanded", "false");
}

async function apiCall(method, path, body = null) {
  if (!activeUser) return;
  const token = await activeUser.getIdToken();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });
  return response.json();
}

function userCollection(name) {
  return collection(db, "users", activeUser.uid, name);
}

function userDoc(name, id) {
  return doc(db, "users", activeUser.uid, name, id);
}

function formatError(error) {
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
    await apiCall("PUT", `/todos/${todo.id}`, {
      ...todo,
      status: select.value,
    });
    await refreshData();
  });

  node.querySelector("button").addEventListener("click", async () => {
    await apiCall("DELETE", `/todos/${todo.id}`);
    await refreshData();
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
          await apiCall("DELETE", `/notes/${note.id}`);
          await refreshData();
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
  const todoRes = await apiCall("GET", "/todos");
  todos = todoRes.data || [];
  notes = (await apiCall("GET", "/notes")) || [];
  renderBoard();
  renderNotes();
}

if (missingConfig) {
  setMessage(
    "Firebase apiKey is missing. Add your Firebase web config in docs/firebase-config.js to use login locally.",
  );
  emailAuthButton.disabled = true;
  googleButton.disabled = true;
} else {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    activeUser = user;
    authPanel.classList.toggle("is-hidden", Boolean(user));
    appPanel.classList.toggle("is-hidden", !user);
    updateUserAvatar(user);
    closeAccountMenu();

    if (user) {
      refreshData();
    } else {
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
    setMessage(formatError(error));
  }
});

googleButton.addEventListener("click", async () => {
  if (missingConfig) return;

  try {
    setMessage("");
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
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

  await apiCall("POST", "/todos", {
    title: todoTitle.value.trim(),
    details: todoDetails.value.trim(),
    status: todoStatus.value,
  });
  await refreshData();
  todoForm.reset();
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
    await apiCall("PUT", `/notes/${editingNoteId}`, payload);
  } else {
    await apiCall("POST", "/notes", payload);
  }

  await refreshData();
  clearNoteForm();
});

setAuthMode("login");
renderBoard();
renderNotes();
