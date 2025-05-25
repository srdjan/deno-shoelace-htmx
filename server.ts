// server.ts
import { serveFile } from "https://deno.land/std@0.221.0/http/file_server.ts";
import { extname } from "https://deno.land/std@0.221.0/path/mod.ts";
import { contentType } from "https://deno.land/std@0.221.0/media_types/content_type.ts";
import { htmlEscape } from "./html_utils.ts";

// Type definitions
type TaskId = string;
type TaskPriority = "low" | "medium" | "high";
const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
type TaskStatus = "active" | "completed";

type Task = {
  id: TaskId;
  title: string;
  description: string;
  priority: TaskPriority;
  completed: boolean;
  createdAt: Date;
};

// In-memory store for tasks (would be a database in production)
// const taskStore = new Map<TaskId, Task>(); // Will be managed by TaskService

// --- Task Service ---
class TaskService {
  private taskStore = new Map<TaskId, Task>();
  private nextId = 4; // Start after seed tasks

  constructor() {
    this.seedInitialTasks();
  }

  private seedInitialTasks(): void {
    const initialTasksData: Omit<Task, 'id' | 'createdAt' | 'completed'>[] = [
      {
        title: "Complete the project setup",
        description: "Initial setup for the Shoelace and HTMX demo",
        priority: "medium",
      },
      {
        title: "Research Web Components",
        description: "Look into Shoelace and other component libraries",
        priority: "low",
      },
      {
        title: "Implement server endpoints",
        description: "Create the API for task management",
        priority: "high",
      },
    ];
    
    // Seed with specific IDs and completion status for consistency with original seed data
    this.createTask(initialTasksData[0], "1", false, new Date());
    this.createTask(initialTasksData[1], "2", true, new Date(Date.now() - 86400000));
    this.createTask(initialTasksData[2], "3", false, new Date());
  }

  getAllTasks(status?: TaskStatus | null): Task[] {
    const tasks = [...this.taskStore.values()];
    const filteredTasks = tasks
      .filter(task => {
        if (status === "active") return !task.completed;
        if (status === "completed") return task.completed;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return filteredTasks;
  }

  getTaskById(id: TaskId): Task | undefined {
    return this.taskStore.get(id);
  }

  createTask(
    data: { title: string; description: string; priority: TaskPriority },
    id?: TaskId, // Optional id for seeding
    completed?: boolean, // Optional completed for seeding
    createdAt?: Date // Optional createdAt for seeding
  ): Task {
    // Validation for createTask
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === "") {
      throw new Error("Invalid task data: Title is required and cannot be empty.");
    }
    if (!TASK_PRIORITIES.includes(data.priority)) {
      throw new Error(`Invalid task data: Priority must be one of ${TASK_PRIORITIES.join(", ")}.`);
    }
    if (typeof data.description !== 'string') {
        throw new Error("Invalid task data: Description must be a string.");
    }

    // Allow seeding without re-validating priority from seed data, as it's controlled internally.
    // However, external calls (without id) must validate priority.
    if (!id && !TASK_PRIORITIES.includes(data.priority)) {
        throw new Error(`Invalid task data: Priority must be one of ${TASK_PRIORITIES.join(", ")}.`);
    }


    const newId = id || (this.nextId++).toString();
    const task: Task = {
      id: newId,
      title: data.title.trim(), // Trim title
      description: data.description, // Description can be empty
      priority: data.priority,
      completed: completed || false,
      createdAt: createdAt || new Date(),
    };
    this.taskStore.set(newId, task);
    return task;
  }

  updateTask(id: TaskId, data: { title?: string; description?: string; priority?: TaskPriority }): Task | undefined {
    const task = this.taskStore.get(id);
    if (!task) {
      return undefined; // Or throw new Error("Task not found") if preferred for consistency
    }

    // Validation for updateTask
    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || data.title.trim() === "") {
        throw new Error("Invalid task data: Title cannot be empty.");
      }
    }
    if (data.priority !== undefined && !TASK_PRIORITIES.includes(data.priority)) {
      throw new Error(`Invalid task data: Priority must be one of ${TASK_PRIORITIES.join(", ")}.`);
    }
    if (data.description !== undefined && typeof data.description !== 'string') {
        throw new Error("Invalid task data: Description must be a string.");
    }

    const updatedTask: Task = {
      ...task,
      title: data.title !== undefined ? data.title.trim() : task.title,
      description: data.description !== undefined ? data.description : task.description,
      priority: data.priority !== undefined ? data.priority : task.priority,
    };
    this.taskStore.set(id, updatedTask);
    return updatedTask;
  }

  toggleTaskCompletion(id: TaskId): Task | undefined {
    const task = this.taskStore.get(id);
    if (!task) {
      return undefined;
    }
    const updatedTask: Task = { ...task, completed: !task.completed };
    this.taskStore.set(id, updatedTask);
    return updatedTask;
  }

  deleteTask(id: TaskId): boolean {
    return this.taskStore.delete(id);
  }
}

const taskService = new TaskService();

// Seed some initial tasks - Now handled by TaskService constructor
// const seedTasks = (): void => {
//   const initialTasks: Task[] = [
//     {
//       id: "1",
//       title: "Complete the project setup",
//       description: "Initial setup for the Shoelace and HTMX demo",
//       priority: "medium",
//       completed: false,
//       createdAt: new Date(),
//     },
//     {
//       id: "2",
//       title: "Research Web Components",
//       description: "Look into Shoelace and other component libraries",
//       priority: "low",
//       completed: true,
//       createdAt: new Date(Date.now() - 86400000), // 1 day ago
//     },
//     {
//       id: "3",
//       title: "Implement server endpoints",
//       description: "Create the API for task management",
//       priority: "high",
//       completed: false,
//       createdAt: new Date(),
//     },
//   ];
//
//   initialTasks.forEach(task => taskStore.set(task.id, task));
// };

// Pure function to generate HTML for a task
const taskToHtml = (task: Task): string => {
  const taskClass = task.completed ? "task-complete" : "";
  const badgeVariant =
    task.priority === "high"
      ? "danger"
      : task.priority === "medium"
        ? "primary"
        : "success";

  return `
    <div id="task-${htmlEscape(task.id)}" class="task-item">
      <div>
        <sl-checkbox
          ${task.completed ? "checked" : ""}
          hx-put="/api/tasks/${htmlEscape(task.id)}/toggle"
          hx-trigger="change"
          hx-swap="outerHTML"
          hx-target="#task-${htmlEscape(task.id)}">
          <span class="${taskClass}">${htmlEscape(task.title)}</span>
        </sl-checkbox>
        <div style="margin-left: 1.75rem; color: var(--sl-color-neutral-600); font-size: 0.875rem;">
          ${htmlEscape(task.description)}
        </div>
      </div>
      
      <div>
        <sl-badge variant="${badgeVariant}">${htmlEscape(task.priority)}</sl-badge>
        <sl-dropdown>
          <sl-button slot="trigger" size="small" variant="neutral" circle>
            <sl-icon name="three-dots-vertical"></sl-icon>
          </sl-button>
          <sl-menu>
            <sl-menu-item hx-get="/api/tasks/${htmlEscape(task.id)}/edit" hx-target="#task-${htmlEscape(task.id)}" hx-swap="outerHTML">
              <sl-icon slot="prefix" name="pencil"></sl-icon>
              Edit
            </sl-menu-item>
            <sl-menu-item hx-delete="/api/tasks/${htmlEscape(task.id)}" hx-target="#task-${htmlEscape(task.id)}" hx-swap="outerHTML" hx-confirm="Are you sure you want to delete this task?">
              <sl-icon slot="prefix" name="trash"></sl-icon>
              Delete
            </sl-menu-item>
          </sl-menu>
        </sl-dropdown>
      </div>
    </div>
  `;
};

// Pure function to generate HTML for a task edit form
const taskEditFormHtml = (task: Task): string => {
  return `
    <form class="task-form edit-task-form"
          hx-put="/api/tasks/${htmlEscape(task.id)}"
          hx-target="#task-${htmlEscape(task.id)}"
          hx-swap="outerHTML">
      
      <sl-input name="title" required placeholder="Task title" value="${htmlEscape(task.title)}"></sl-input>
      
      <sl-textarea name="description" placeholder="Description">${htmlEscape(task.description)}</sl-textarea>
      
      <sl-select name="priority" placeholder="Select priority" value="${htmlEscape(task.priority)}">
        <sl-option value="low">Low</sl-option>
        <sl-option value="medium">Medium</sl-option>
        <sl-option value="high">High</sl-option>
      </sl-select>
      
      <div class="form-actions">
        <sl-button 
          type="button" 
          variant="neutral"
          hx-get="/api/tasks/${htmlEscape(task.id)}"
          hx-target="#task-${htmlEscape(task.id)}"
          hx-swap="outerHTML">
          Cancel
        </sl-button>
        <sl-button type="submit" variant="primary">Save</sl-button>
      </div>
    </form>
  `;
};

// Helper to parse form data
async function parseFormData(req: Request): Promise<FormData> {
  return await req.formData();
}

// --- Error Response Helpers ---
function jsonErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function htmlErrorResponse(message: string, status: number, variant: "danger" | "warning" = "danger"): Response {
  const alertHtml = `
    <sl-alert variant="${variant}" open closable>
      <sl-icon slot="icon" name="${variant === 'danger' ? 'exclamation-octagon' : 'exclamation-triangle'}"></sl-icon>
      ${htmlEscape(message)}
    </sl-alert>
  `;
  return new Response(alertHtml, {
    status,
    headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" },
  });
}

// Helper to parse URL path params
function getPathParams(pattern: string, path: string): Record<string, string> {
  const patternSegments = pattern.split('/');
  const urlSegments = path.split('/');
  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    if (patternSegments[i].startsWith(':')) {
      const paramName = patternSegments[i].slice(1);
      params[paramName] = urlSegments[i];
    }
  }

  return params;
}

// Route handlers
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // Handle preflight requests
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: DEFAULT_CORS_HEADERS,
    });
  }

  if (path === "/" || !path.startsWith("/api")) {
    return serveStaticFile(req, path);
  } else {
    return handleApiRequest(req, path, method);
  }
}

// Default CORS headers
const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Serve static files
async function serveStaticFile(req: Request, path: string): Promise<Response> {
  const filePath = path === "/" ? "./public/index.html" : `./public${path}`;
  const fileExt = extname(filePath);
  const responseContentType = contentType(fileExt) || "application/octet-stream";

  try {
    const fileResponse = await serveFile(req, filePath);
    const newHeaders = new Headers(fileResponse.headers);
    newHeaders.set("Content-Type", responseContentType);
    Object.entries(DEFAULT_CORS_HEADERS).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(fileResponse.body, {
      status: fileResponse.status,
      headers: newHeaders,
    });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return new Response("File Not Found", { // Keep it simple for static files
        status: 404,
        headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/plain" },
      });
    }
    console.error(`Error serving static file ${filePath}:`, e);
    return new Response("Internal Server Error", { // Keep it simple for static files
      status: 500,
      headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/plain" },
    });
  }
}

// Handle API requests
async function handleApiRequest(req: Request, path: string, method: string): Promise<Response> {
  const url = new URL(req.url); // Keep for searchParams if needed by handlers

  // GET /api/tasks - List all tasks
  if (path === "/api/tasks" && method === "GET") {
    return getTasksHandler(req, url);
  }

  // POST /api/tasks - Create a new task
  if (path === "/api/tasks" && method === "POST") {
    return createTaskHandler(req);
  }

  // GET /api/tasks/:id - Get a single task
  if (path.match(/^\/api\/tasks\/\w+$/) && method === "GET") {
    const params = getPathParams("/api/tasks/:id", path);
    return getTaskByIdHandler(req, params.id);
  }

  // PUT /api/tasks/:id - Update a task
  if (path.match(/^\/api\/tasks\/\w+$/) && method === "PUT") {
    const params = getPathParams("/api/tasks/:id", path);
    return updateTaskHandler(req, params.id);
  }

  // DELETE /api/tasks/:id - Delete a task
  if (path.match(/^\/api\/tasks\/\w+$/) && method === "DELETE") {
    const params = getPathParams("/api/tasks/:id", path);
    return deleteTaskHandler(req, params.id);
  }

  // GET /api/tasks/:id/edit - Get task edit form
  if (path.match(/^\/api\/tasks\/\w+\/edit$/) && method === "GET") {
    const params = getPathParams("/api/tasks/:id/edit", path);
    return getTaskEditFormHandler(req, params.id);
  }

  // PUT /api/tasks/:id/toggle - Toggle task completion
  if (path.match(/^\/api\/tasks\/\w+\/toggle$/) && method === "PUT") {
    const params = getPathParams("/api/tasks/:id/toggle", path);
    return toggleTaskHandler(req, params.id);
  }

  return jsonErrorResponse("API Endpoint Not Found", 404);
}

// --- API Endpoint Handlers ---

async function getTasksHandler(req: Request, url: URL): Promise<Response> {
  const status = url.searchParams.get("status") as TaskStatus | null;
  const filteredTasks = taskService.getAllTasks(status);

  if (filteredTasks.length === 0) {
    return new Response(`
      <sl-alert variant="neutral" open>
        <sl-icon slot="icon" name="info-circle"></sl-icon>
        No tasks found. Add your first task above.
      </sl-alert>
    `, {
      headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" }
    });
  }

  return new Response(
    filteredTasks.map(task => taskToHtml(task)).join(""),
    { headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" } }
  );
}

async function createTaskHandler(req: Request): Promise<Response> {
  try {
    const formData = await parseFormData(req);
    const taskData = {
      title: formData.get("title")?.toString() || "", // Default to empty string for service validation
      description: formData.get("description")?.toString() || "", // Default to empty string
      priority: (formData.get("priority")?.toString() || "medium") as TaskPriority, // Default for now
    };
    // Ensure priority is explicitly set if not provided by form, or let service validate
     if (!formData.has("priority")) {
        taskData.priority = "medium"; // Or handle as potentially invalid if desired
    }


    const newTask = taskService.createTask(taskData);
    return new Response(taskToHtml(newTask), {
      headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" }
    });
  } catch (e) {
    // Check if it's an error from our validation
    if (e.message.startsWith("Invalid task data:")) {
      return htmlErrorResponse(e.message, 400);
    }
    // Generic error for other cases (e.g., parseFormData failure)
    console.error("Error in createTaskHandler:", e);
    return htmlErrorResponse("Failed to create task due to an unexpected error.", 500);
  }
}

async function getTaskByIdHandler(req: Request, id: TaskId): Promise<Response> {
  const task = taskService.getTaskById(id);
  if (!task) {
    return htmlErrorResponse("Task not found.", 404);
  }
  return new Response(taskToHtml(task), {
    headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" }
  });
}

async function updateTaskHandler(req: Request, id: TaskId): Promise<Response> {
  try {
    const formData = await parseFormData(req);
    const taskData = {
      title: formData.get("title")?.toString(),
      description: formData.get("description")?.toString(),
      priority: formData.get("priority")?.toString() as TaskPriority | undefined,
    };
    // Filter out undefined values so only provided fields are updated
    const validTaskData: { title?: string; description?: string; priority?: TaskPriority } = {};
    if (taskData.title !== undefined) validTaskData.title = taskData.title;
    if (taskData.description !== undefined) validTaskData.description = taskData.description;
    if (taskData.priority !== undefined) validTaskData.priority = taskData.priority;


    const updatedTask = taskService.updateTask(id, validTaskData);
    if (!updatedTask) {
      // This case is hit if service.updateTask returns undefined (e.g. task not found before validation)
      return htmlErrorResponse("Task not found.", 404);
    }
    return new Response(taskToHtml(updatedTask), {
      headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" }
    });
  } catch (e) {
     // Check if it's an error from our validation in TaskService
    if (e.message.startsWith("Invalid task data:")) {
      return htmlErrorResponse(e.message, 400);
    }
    // This would be for a case where TaskService.updateTask itself throws "Task not found"
    // Currently, it returns undefined if task isn't found initially, handled above.
    // if (e.message === "Task not found") { 
    //     return htmlErrorResponse("Task not found.", 404);
    // }
    // Generic error for other cases
    console.error(`Error in updateTaskHandler for ID ${id}:`, e);
    return htmlErrorResponse("Failed to update task due to an unexpected error.", 500);
  }
}

async function deleteTaskHandler(req: Request, id: TaskId): Promise<Response> {
  const success = taskService.deleteTask(id);
  if (!success) {
    return jsonErrorResponse("Task not found or could not be deleted.", 404);
  }
  return new Response(null, { // Success, no content
    status: 204, 
    headers: DEFAULT_CORS_HEADERS // Ensure CORS headers even for 204
  });
}

async function getTaskEditFormHandler(req: Request, id: TaskId): Promise<Response> {
  const task = taskService.getTaskById(id);
  if (!task) {
    return htmlErrorResponse("Task not found.", 404);
  }
  return new Response(taskEditFormHtml(task), {
    headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" }
  });
}

async function toggleTaskHandler(req: Request, id: TaskId): Promise<Response> {
  const updatedTask = taskService.toggleTaskCompletion(id);
  if (!updatedTask) {
    return htmlErrorResponse("Task not found.", 404);
  }
  return new Response(taskToHtml(updatedTask), {
    headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "text/html" }
  });
}

// Initialize
// seedTasks(); // Now handled by TaskService constructor
// Helper function to get content type based on file extension
// REMOVED

// Initialize
// seedTasks(); // Already called above

// Start the server with native Deno.serve API
const port = 8070;
console.log(`Server running on http://localhost:${port}`);
Deno.serve({ port }, handleRequest);
