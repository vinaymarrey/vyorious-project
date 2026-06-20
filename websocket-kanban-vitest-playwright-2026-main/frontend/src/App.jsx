import React from "react";
import "./index.css";
import KanbanBoard from "./components/KanbanBoard";

export default function App() {
  return (
    <div className="app">
      <h1>Real-time Kanban Board</h1>
      <KanbanBoard />
    </div>
  );
}
