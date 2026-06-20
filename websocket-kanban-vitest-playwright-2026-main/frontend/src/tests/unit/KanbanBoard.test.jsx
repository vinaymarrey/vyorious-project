import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// hoisted so the mock factory can reference it
const mockSocket = vi.hoisted(() => ({
  on: vi.fn((event, cb) => {
    // auto-resolve sync:tasks so component exits loading state
    if (event === "sync:tasks") cb([]);
  }),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
}));

vi.mock("socket.io-client", () => ({ io: () => mockSocket }));

import KanbanBoard from "../../components/KanbanBoard";

describe("KanbanBoard - unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockImplementation((event, cb) => {
      if (event === "sync:tasks") cb([]);
    });
  });

  it("renders all three columns", () => {
    render(<KanbanBoard />);
    expect(screen.getAllByText(/To Do/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In Progress/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Done/).length).toBeGreaterThan(0);
  });

  it("renders the add task form elements", () => {
    render(<KanbanBoard />);
    expect(screen.getByPlaceholderText("Task title")).toBeInTheDocument();
    expect(screen.getByText("Add Task")).toBeInTheDocument();
  });

  it("emits task:create when Add Task is clicked with a title", () => {
    render(<KanbanBoard />);
    fireEvent.change(screen.getByPlaceholderText("Task title"), { target: { value: "Fix login bug" } });
    fireEvent.click(screen.getByText("Add Task"));
    expect(mockSocket.emit).toHaveBeenCalledWith("task:create", expect.objectContaining({ title: "Fix login bug", column: "To Do" }));
  });

  it("does not emit if title is empty", () => {
    render(<KanbanBoard />);
    fireEvent.click(screen.getByText("Add Task"));
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("renders the progress chart section", () => {
    render(<KanbanBoard />);
    expect(screen.getByTestId("progress-chart")).toBeInTheDocument();
    expect(screen.getByText("Task Progress")).toBeInTheDocument();
  });

  it("priority select has correct default and options", () => {
    render(<KanbanBoard />);
    const sel = screen.getByTestId("priority-select");
    expect(sel.value).toBe("Low");
    const options = Array.from(sel.options).map((o) => o.value);
    expect(options).toEqual(["Low", "Medium", "High"]);
  });

  it("category select has correct default and options", () => {
    render(<KanbanBoard />);
    const sel = screen.getByTestId("category-select");
    expect(sel.value).toBe("Bug");
    const options = Array.from(sel.options).map((o) => o.value);
    expect(options).toEqual(["Bug", "Feature", "Enhancement"]);
  });
});
