const form        = document.getElementById("todo-form");
const editIdInput = document.getElementById("edit-id");
const taskInput   = document.getElementById("task");
const prioritySel = document.getElementById("priority");
const descInput   = document.getElementById("description");
const completedCb = document.getElementById("completed");
const tbody       = document.getElementById("results-body");
const submitBtn   = document.getElementById("submit-btn");
const logoutBtn   = document.getElementById("logout-btn");

async function jsonFetch(url, options) {
  const res = await fetch(url, options);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    // Likely got redirected to the login page 
    location.href = '/';
    throw new Error('Not authenticated');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Render
function render(todos) {
  tbody.innerHTML = "";
  if (!Array.isArray(todos) || todos.length === 0) {
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    tr.innerHTML = `<td colspan="7">No items yet.</td>`;
    tbody.appendChild(tr);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const t of todos) {
    const tr = document.createElement("tr");
    const created = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "";
    const due     = t.dueDate   ? new Date(t.dueDate).toLocaleDateString()   : "";

    tr.innerHTML = `
      <td>${t.task ?? ""}</td>
      <td>${t.priority ?? ""}</td>
      <td>${t.description ?? ""}</td>
      <td>${t.completed ? "Yes" : "No"}</td>
      <td>${created}</td>
      <td>${due}</td>
      <td>
        <button type="button" class="edit-btn"
          data-id="${t._id}"
          data-task="${t.task ?? ""}"
          data-priority="${t.priority ?? ""}"
          data-description="${t.description ?? ""}"
          data-completed="${t.completed ? "1" : ""}"
        >Edit</button>
        <button type="button" class="delete-btn danger" data-id="${t._id}">Delete</button>
      </td>
    `;
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
}

// Initial load -> /api/todos
window.addEventListener("DOMContentLoaded", () => {
  jsonFetch("/api/todos")
    .then(r => r.json())
    .then(render)
    .catch(err => console.error("Failed to load", err));
});

// Form submit: create or update
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = editIdInput?.value?.trim() || "";
  const payload = {
    task: (taskInput.value || "").trim(),
    priority: prioritySel.value,
    description: descInput.value || "",
    completed: !!completedCb.checked
  };

  if (!payload.task) { taskInput.focus(); return; }
  if (!["low","medium","high"].includes(payload.priority)) return;

  submitBtn.disabled = true;

  const url  = id ? "/api/todos/update" : "/api/todos";
  const body = id ? { id, ...payload } : payload;

  jsonFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(r => r.json())
  .then((todos) => {
    form.reset();
    if (editIdInput) editIdInput.value = "";
    submitBtn.textContent = "Add";
    render(todos);
  })
  .catch(err => console.error("Request failed:", err))
  .finally(() => { submitBtn.disabled = false; });
});

// Table actions: Delete + Edit (event delegation)
tbody.addEventListener("click", (e) => {
  const delBtn = e.target.closest(".delete-btn");
  if (delBtn) {
    const id = delBtn.dataset.id;
    if (!id) return;

    delBtn.disabled = true;
    jsonFetch("/api/todos/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    .then(r => r.json())
    .then(render)
    .catch(err => console.error("Delete failed", err))
    .finally(() => { delBtn.disabled = false; });

    return;
  }

  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    editIdInput.value = editBtn.dataset.id || "";
    taskInput.value = editBtn.dataset.task || "";
    prioritySel.value = editBtn.dataset.priority || "";
    descInput.value = editBtn.dataset.description || "";
    completedCb.checked = !!editBtn.dataset.completed;

    submitBtn.textContent = "Save";
    taskInput.focus();
  }
});

// Logout
logoutBtn?.addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" }).catch(()=>{});
  location.href = "/";
});
