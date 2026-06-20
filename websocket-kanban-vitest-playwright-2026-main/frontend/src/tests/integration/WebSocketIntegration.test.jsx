import { render, screen, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// capture socket event callbacks so we can trigger them manually in tests
const { mockSocket, socketCallbacks } = vi.hoisted(() => {
  const socketCallbacks = {};
  return {
    socketCallbacks,
    mockSocket: {
      on: vi.fn((event, cb) => { socketCallbacks[event] = cb; }),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    },
  };
});

vi.mock("socket.io-client", () => ({ io: () => mockSocket }));

import KanbanBoard from "../../components/KanbanBoard";

const sampleTask = { id: "1", title: "Test task", desc: "desc", priority: "High", category: "Bug", column: "To Do", attachment: null };

describe("WebSocket integration tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockImplementation((event, cb) => { socketCallbacks[event] = cb; });
  });

  it("sync:tasks populates the board on connect", async () => {
    render(<KanbanBoard />);
    act(() => socketCallbacks["sync:tasks"]([sampleTask]));
    expect(screen.getByText("Test task")).toBeInTheDocument();
  });

  it("task:create event adds a task to the board", async () => {
    render(<KanbanBoard />);
    act(() => socketCallbacks["sync:tasks"]([]));
    act(() => socketCallbacks["task:create"](sampleTask));
    expect(screen.getByText("Test task")).toBeInTheDocument();
  });

  it("task:delete event removes a task from the board", async () => {
    render(<KanbanBoard />);
    act(() => socketCallbacks["sync:tasks"]([sampleTask]));
    expect(screen.getByText("Test task")).toBeInTheDocument();
    act(() => socketCallbacks["task:delete"]("1"));
    expect(screen.queryByText("Test task")).not.toBeInTheDocument();
  });

  it("task:update event updates task title on the board", async () => {
    render(<KanbanBoard />);
    act(() => socketCallbacks["sync:tasks"]([sampleTask]));
    act(() => socketCallbacks["task:update"]({ ...sampleTask, title: "Updated task" }));
    expect(screen.getByText("Updated task")).toBeInTheDocument();
    expect(screen.queryByText("Test task")).not.toBeInTheDocument();
  });

  it("task:move event moves task to a different column", async () => {
    render(<KanbanBoard />);
    act(() => socketCallbacks["sync:tasks"]([sampleTask]));
    act(() => socketCallbacks["task:move"]({ id: "1", column: "Done" }));
    const doneColumn = screen.getByTestId("column-Done");
    expect(doneColumn).toHaveTextContent("Test task");
  });

  it("sync:tasks with multiple tasks shows correct counts", () => {
    const tasks = [
      { ...sampleTask, id: "1", column: "To Do" },
      { ...sampleTask, id: "2", column: "To Do" },
      { ...sampleTask, id: "3", column: "Done" },
    ];
    render(<KanbanBoard />);
    act(() => socketCallbacks["sync:tasks"](tasks));
    expect(screen.getByTestId("column-To Do")).toHaveTextContent("(2)");
    expect(screen.getByTestId("column-Done")).toHaveTextContent("(1)");
  });
});
