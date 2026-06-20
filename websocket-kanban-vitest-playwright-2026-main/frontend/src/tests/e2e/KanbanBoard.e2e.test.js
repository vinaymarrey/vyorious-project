import { test, expect } from "@playwright/test";
import path from "path";

// NOTE: Both servers must be running before E2E tests:
//   Backend: cd backend && node server.js
//   Frontend: cd frontend && npm run dev  (or build + preview)

test.describe("Kanban Board E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='board']");
  });

  test("page loads and shows board title", async ({ page }) => {
    await expect(page.getByText("Real-time Kanban Board")).toBeVisible();
    await expect(page.getByText(/To Do/)).toBeVisible();
    await expect(page.getByText(/In Progress/)).toBeVisible();
    await expect(page.getByText(/Done/)).toBeVisible();
  });

  test("user can create a task and see it on the board", async ({ page }) => {
    await page.fill('[placeholder="Task title"]', "My first task");
    await page.fill('[placeholder="Description"]', "Some description");
    await page.click("text=Add Task");
    await expect(page.getByText("My first task")).toBeVisible();
  });

  test("user can delete a task", async ({ page }) => {
    await page.fill('[placeholder="Task title"]', "Task to delete");
    await page.click("text=Add Task");
    await expect(page.getByText("Task to delete")).toBeVisible();
    await page.getByText("Delete").first().click();
    await expect(page.getByText("Task to delete")).not.toBeVisible();
  });

  test("user can select a priority level", async ({ page }) => {
    await page.selectOption('[data-testid="priority-select"]', "High");
    await expect(page.locator('[data-testid="priority-select"]')).toHaveValue("High");
    await page.fill('[placeholder="Task title"]', "High priority task");
    await page.click("text=Add Task");
    await expect(page.getByText("High")).toBeVisible();
  });

  test("user can change the task category", async ({ page }) => {
    await page.selectOption('[data-testid="category-select"]', "Feature");
    await expect(page.locator('[data-testid="category-select"]')).toHaveValue("Feature");
    await page.fill('[placeholder="Task title"]', "Feature task");
    await page.click("text=Add Task");
    await expect(page.getByText("Feature")).toBeVisible();
  });

  test("user can upload an image and see a preview", async ({ page }) => {
    await page.fill('[placeholder="Task title"]', "Task with image");
    await page.setInputFiles('[data-testid="file-input"]', {
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-image-data"),
    });
    await page.click("text=Add Task");
    await expect(page.locator('[data-testid="attachment-preview"]')).toBeVisible();
  });

  test("uploading an invalid file shows an error", async ({ page }) => {
    const alertPromise = page.waitForEvent("dialog");
    await page.setInputFiles('[data-testid="file-input"]', {
      name: "virus.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("bad-data"),
    });
    const dialog = await alertPromise;
    expect(dialog.message()).toContain("Invalid file type");
    await dialog.accept();
  });

  test("progress chart updates when a task is added", async ({ page }) => {
    await page.fill('[placeholder="Task title"]', "Chart test task");
    await page.click("text=Add Task");
    const chart = page.getByTestId("progress-chart");
    await expect(chart).toContainText("1");
  });

  test("drag and drop moves task between columns", async ({ page }) => {
    await page.fill('[placeholder="Task title"]', "Drag me");
    await page.click("text=Add Task");
    const card = page.locator('[data-testid="task-card"]').first();
    const target = page.locator('[data-testid="column-In Progress"]');
    await card.dragTo(target);
    await expect(target).toContainText("Drag me");
  });
});
