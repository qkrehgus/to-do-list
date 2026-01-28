/**
 * 날짜별 To‑Do List (LocalStorage 기반)
 * - 저장 단위: YYYY-MM-DD 별 배열
 * - 각 todo: { id: string, text: string, done: boolean, createdAt: number }
 */

const STORAGE_KEY = "dateTodo.v1";

/** @returns {string} YYYY-MM-DD (local time) */
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** @param {string} iso YYYY-MM-DD */
function humanizeDate(iso) {
  // Date(iso)는 UTC로 해석될 수 있어 직접 파싱
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const week = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${y}년 ${m}월 ${d}일 (${week})`;
}

function uid() {
  // crypto.randomUUID가 없을 수도 있어 fallback 제공
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** @returns {{[dateISO: string]: Array<{id:string,text:string,done:boolean,createdAt:number}>}} */
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

/** @param {ReturnType<typeof loadAll>} data */
function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** @param {string} dateISO */
function loadList(dateISO) {
  const data = loadAll();
  const list = data[dateISO];
  return Array.isArray(list) ? list : [];
}

/** @param {string} dateISO @param {Array} list */
function saveList(dateISO, list) {
  const data = loadAll();
  data[dateISO] = list;
  saveAll(data);
}

function escapeText(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// DOM
const dateInput = document.getElementById("dateInput");
const todayBtn = document.getElementById("todayBtn");
const selectedDateHuman = document.getElementById("selectedDateHuman");
const addForm = document.getElementById("addForm");
const todoInput = document.getElementById("todoInput");
const todoListEl = document.getElementById("todoList");
const emptyState = document.getElementById("emptyState");
const countHint = document.getElementById("countHint");

let selectedDate = todayISO();

function render() {
  const list = loadList(selectedDate);
  const doneCount = list.filter((t) => t.done).length;

  selectedDateHuman.textContent = humanizeDate(selectedDate);
  countHint.textContent = `총 ${list.length}개 · 완료 ${doneCount}개`;

  if (list.length === 0) {
    todoListEl.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  todoListEl.innerHTML = list
    .slice()
    .sort((a, b) => {
      // 생성순(오래된 것 먼저), 단 완료는 아래로
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    })
    .map((t) => {
      const safeText = escapeText(t.text);
      const doneClass = t.done ? "isDone" : "";
      const pill = t.done ? "완료" : "진행중";
      return `
        <li class="todoItem ${doneClass}" data-id="${t.id}">
          <input class="todoCheck" type="checkbox" ${t.done ? "checked" : ""} aria-label="완료" />
          <div class="todoText">${safeText}</div>
          <div class="todoMeta">
            <span class="pill">${pill}</span>
            <button class="iconBtn iconBtnDanger" type="button" data-action="delete" aria-label="삭제">삭제</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function setDate(dateISO) {
  selectedDate = dateISO;
  dateInput.value = dateISO;
  render();
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const list = loadList(selectedDate);
  list.push({ id: uid(), text: trimmed, done: false, createdAt: Date.now() });
  saveList(selectedDate, list);
  render();
}

function toggleTodo(id, done) {
  const list = loadList(selectedDate);
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], done: !!done };
  saveList(selectedDate, list);
  render();
}

function deleteTodo(id) {
  const list = loadList(selectedDate);
  const next = list.filter((t) => t.id !== id);
  saveList(selectedDate, next);
  render();
}

// Events
dateInput.addEventListener("change", () => {
  const v = dateInput.value;
  if (!v) return;
  setDate(v);
});

todayBtn.addEventListener("click", () => setDate(todayISO()));

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo(todoInput.value);
  todoInput.value = "";
  todoInput.focus();
});

todoListEl.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const item = target.closest(".todoItem");
  if (!item) return;
  const id = item.getAttribute("data-id");
  if (!id) return;

  if (target.matches('button[data-action="delete"]')) {
    deleteTodo(id);
  }
});

todoListEl.addEventListener("change", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.classList.contains("todoCheck")) return;
  const item = target.closest(".todoItem");
  if (!item) return;
  const id = item.getAttribute("data-id");
  if (!id) return;
  toggleTodo(id, target.checked);
});

// Init
setDate(todayISO());
todoInput.focus();
