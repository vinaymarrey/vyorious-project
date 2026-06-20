import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const COLUMNS = ["To Do", "In Progress", "Done"];
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://websocket-kanban-backend.onrender.com";
const socket = io(BACKEND_URL);

export default function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", desc: "", priority: "Low", category: "Bug" });
  const [attachment, setAttachment] = useState(null);
  const dragId = useRef(null);

  useEffect(() => {
    socket.on("sync:tasks", (data) => { setTasks(data); setLoading(false); });
    socket.on("task:create", (t) => setTasks((prev) => [...prev, t]));
    socket.on("task:update", (t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x))));
    socket.on("task:move", ({ id, column }) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, column } : x))));
    socket.on("task:delete", (id) => setTasks((prev) => prev.filter((x) => x.id !== id)));
    return () => socket.removeAllListeners();
  }, []);

  const addTask = () => {
    if (!form.title.trim()) return;
    const task = { ...form, id: Date.now().toString(), column: "To Do", attachment };
    socket.emit("task:create", task);
    setForm({ title: "", desc: "", priority: "Low", category: "Bug" });
    setAttachment(null);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      alert("Invalid file type. Please upload an image or PDF.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, url: reader.result, type: file.type });
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="loading" data-testid="loading">Connecting to server...</div>;

  return (
    <div>
      <div className="form-row">
        <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input placeholder="Description" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
        <select data-testid="priority-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {["Low", "Medium", "High"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select data-testid="category-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {["Bug", "Feature", "Enhancement"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input data-testid="file-input" type="file" accept="image/*,.pdf" onChange={handleFile} />
        <button onClick={addTask}>Add Task</button>
      </div>

      <div className="board" data-testid="board">
        {COLUMNS.map((col) => (
          <div key={col} className="column" data-testid={`column-${col}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => socket.emit("task:move", { id: dragId.current, column: col })}>
            <h3>{col} <span className="count">({tasks.filter((t) => t.column === col).length})</span></h3>
            {tasks.filter((t) => t.column === col).map((task) => (
              <div key={task.id} className="card" data-testid="task-card"
                draggable onDragStart={() => (dragId.current = task.id)}>
                <strong>{task.title}</strong>
                <p>{task.desc}</p>
                <div className="badges">
                  <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  <span className="category">{task.category}</span>
                </div>
                {task.attachment?.type?.startsWith("image") && (
                  <img src={task.attachment.url} alt={task.attachment.name} width={80} data-testid="attachment-preview" />
                )}
                {task.attachment && !task.attachment.type?.startsWith("image") && (
                  <p>📎 {task.attachment.name}</p>
                )}
                <button onClick={() => socket.emit("task:delete", task.id)}>Delete</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="chart" data-testid="progress-chart">
        <h3>Task Progress</h3>
        {COLUMNS.map((col) => {
          const count = tasks.filter((t) => t.column === col).length;
          const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
          return (
            <div key={col} className="bar-row">
              <span className="col-label">{col}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
              <span>{count} ({pct}%)</span>
            </div>
          );
        })}
        <p className="completion">
          Overall completion: {tasks.length ? Math.round((tasks.filter((t) => t.column === "Done").length / tasks.length) * 100) : 0}%
        </p>
      </div>
    </div>
  );
}
