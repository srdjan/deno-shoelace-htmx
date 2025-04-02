// server.ts
import { serveFile } from "https://deno.land/std@0.221.0/http/file_server.ts";
import { extname } from "https://deno.land/std@0.221.0/path/mod.ts";

// Type definitions
type TaskId = string;
type TaskPriority = "low" | "medium" | "high";
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
const taskStore = new Map<TaskId, Task>();

// Seed some initial tasks
const seedTasks = (): void => {
  const initialTasks: Task[] = [
    {
      id: "1",
      title: "Complete the project setup",
      description: "Initial setup for the Shoelace and HTMX demo",
      priority: "medium",
      completed: false,
      createdAt: new Date(),
    },
    {
      id: "2",
      title: "Research Web Components",
      description: "Look into Shoelace and other component libraries",
      priority: "low",
      completed: true,
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: "3",
      title: "Implement server endpoints",
      description: "Create the API for task management",
      priority: "high",
      completed: false,
      createdAt: new Date(),
    },
  ];

  initialTasks.forEach(task => taskStore.set(task.id, task));
};

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
    <div id="task-${task.id}" class="task-item">
      <div>
        <sl-checkbox
          ${task.completed ? "checked" : ""}
          hx-put="/api/tasks/${task.id}/toggle"
          hx-trigger="change"
          hx-swap="outerHTML"
          hx-target="#task-${task.id}">
          <span class="${taskClass}">${task.title}</span>
        </sl-checkbox>
        <div style="margin-left: 1.75rem; color: var(--sl-color-neutral-600); font-size: 0.875rem;">
          ${task.description}
        </div>
      </div>
      
      <div>
        <sl-badge variant="${badgeVariant}">${task.priority}</sl-badge>
        <sl-dropdown>
          <sl-button slot="trigger" size="small" variant="neutral" circle>
            <sl-icon name="three-dots-vertical"></sl-icon>
          </sl-button>
          <sl-menu>
            <sl-menu-item hx-get="/api/tasks/${task.id}/edit" hx-target="#task-${task.id}" hx-swap="outerHTML">
              <sl-icon slot="prefix" name="pencil"></sl-icon>
              Edit
            </sl-menu-item>
            <sl-menu-item hx-delete="/api/tasks/${task.id}" hx-target="#task-${task.id}" hx-swap="outerHTML" hx-confirm="Are you sure you want to delete this task?">
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
          hx-put="/api/tasks/${task.id}"
          hx-target="#task-${task.id}"
          hx-swap="outerHTML">
      
      <sl-input name="title" required placeholder="Task title" value="${task.title}"></sl-input>
      
      <sl-textarea name="description" placeholder="Description">${task.description}</sl-textarea>
      
      <sl-select name="priority" placeholder="Select priority" value="${task.priority}">
        <sl-option value="low">Low</sl-option>
        <sl-option value="medium">Medium</sl-option>
        <sl-option value="high">High</sl-option>
      </sl-select>
      
      <div class="form-actions">
        <sl-button 
          type="button" 
          variant="neutral"
          hx-get="/api/tasks/${task.id}"
          hx-target="#task-${task.id}"
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

// Helper to parse URL path params
function getPathParams(pattern: string, url: string): Record<string, string> {
  const patternSegments = pattern.split('/');
  const urlSegments = new URL(url).pathname.split('/');
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

  // CORS headers for all responses
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight requests
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers
    });
  }

  // Static file handling
  console.log(path);
  if (path === "/" || !path.startsWith("/api")) {
    try {
      const filePath = path === "/" ? "./public/index.html" : `./public${path}`;
      const contentType = getContentType(filePath);
      const fileResponse = await serveFile(req, filePath);

      // Add content type and CORS headers to file response
      const newHeaders = new Headers(fileResponse.headers);
      newHeaders.set("Content-Type", contentType);
      Object.entries(headers).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(fileResponse.body, {
        status: fileResponse.status,
        headers: newHeaders,
      });
    } catch (e) {
      // If file not found, continue to API routing
      if (!(e instanceof Deno.errors.NotFound)) {
        return new Response("Server Error", {
          status: 500,
          headers: { ...headers, "Content-Type": "text/plain" }
        });
      }
    }
  }

  // API Routes
  // GET /api/tasks - List all tasks
  if (path === "/api/tasks" && method === "GET") {
    const status = url.searchParams.get("status") as TaskStatus | null;

    const filteredTasks = [...taskStore.values()]
      .filter(task => {
        if (status === "active") return !task.completed;
        if (status === "completed") return task.completed;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filteredTasks.length === 0) {
      return new Response(`
        <sl-alert variant="neutral" open>
          <sl-icon slot="icon" name="info-circle"></sl-icon>
          No tasks found. Add your first task above.
        </sl-alert>
      `, {
        headers: { ...headers, "Content-Type": "text/html" }
      });
    }

    return new Response(
      filteredTasks.map(task => taskToHtml(task)).join(""),
      { headers: { ...headers, "Content-Type": "text/html" } }
    );
  }

  // GET /api/tasks/:id - Get a single task
  if (path.match(/^\/api\/tasks\/\d+$/) && method === "GET") {
    const params = getPathParams("/api/tasks/:id", url.pathname);
    const id = params.id;
    const task = taskStore.get(id);

    if (!task) {
      return new Response("Task not found", {
        status: 404,
        headers: { ...headers, "Content-Type": "text/plain" }
      });
    }

    return new Response(taskToHtml(task), {
      headers: { ...headers, "Content-Type": "text/html" }
    });
  }

  // GET /api/tasks/:id/edit - Get task edit form
  if (path.match(/^\/api\/tasks\/\d+\/edit$/) && method === "GET") {
    const params = getPathParams("/api/tasks/:id/edit", url.pathname);
    const id = params.id;
    const task = taskStore.get(id);

    if (!task) {
      return new Response("Task not found", {
        status: 404,
        headers: { ...headers, "Content-Type": "text/plain" }
      });
    }

    return new Response(taskEditFormHtml(task), {
      headers: { ...headers, "Content-Type": "text/html" }
    });
  }

  // POST /api/tasks - Create a new task
  if (path === "/api/tasks" && method === "POST") {
    try {
      const formData = await parseFormData(req);

      // Generate a new ID
      const newId = (taskStore.size + 1).toString();

      // Create the task with validated data
      const task: Task = {
        id: newId,
        title: formData.get("title")?.toString() || "",
        description: formData.get("description")?.toString() || "",
        priority: (formData.get("priority")?.toString() || "medium") as TaskPriority,
        completed: false,
        createdAt: new Date(),
      };

      // Store the task
      taskStore.set(newId, task);

      // Return the HTML for the new task
      return new Response(taskToHtml(task), {
        headers: { ...headers, "Content-Type": "text/html" }
      });
    } catch (e) {
      return new Response("Invalid form data", {
        status: 400,
        headers: { ...headers, "Content-Type": "text/plain" }
      });
    }
  }

  // PUT /api/tasks/:id - Update a task
  if (path.match(/^\/api\/tasks\/\d+$/) && method === "PUT") {
    try {
      const params = getPathParams("/api/tasks/:id", url.pathname);
      const id = params.id;
      const task = taskStore.get(id);

      if (!task) {
        return new Response("Task not found", {
          status: 404,
          headers: { ...headers, "Content-Type": "text/plain" }
        });
      }

      // Get form data
      const formData = await parseFormData(req);

      // Update the task (immutably)
      const updatedTask: Task = {
        ...task,
        title: formData.get("title")?.toString() || task.title,
        description: formData.get("description")?.toString() || task.description,
        priority: (formData.get("priority")?.toString() || task.priority) as TaskPriority,
      };

      // Store the updated task
      taskStore.set(id, updatedTask);

      // Return the HTML for the updated task
      return new Response(taskToHtml(updatedTask), {
        headers: { ...headers, "Content-Type": "text/html" }
      });
    } catch (e) {
      return new Response("Invalid form data", {
        status: 400,
        headers: { ...headers, "Content-Type": "text/plain" }
      });
    }
  }

  // PUT /api/tasks/:id/toggle - Toggle task completion
  if (path.match(/^\/api\/tasks\/\d+\/toggle$/) && method === "PUT") {
    const params = getPathParams("/api/tasks/:id/toggle", url.pathname);
    const id = params.id;
    const task = taskStore.get(id);

    if (!task) {
      return new Response("Task not found", {
        status: 404,
        headers: { ...headers, "Content-Type": "text/plain" }
      });
    }

    // Toggle the completion status (immutably)
    const updatedTask: Task = {
      ...task,
      completed: !task.completed,
    };

    // Store the updated task
    taskStore.set(id, updatedTask);

    // Return the HTML for the updated task
    return new Response(taskToHtml(updatedTask), {
      headers: { ...headers, "Content-Type": "text/html" }
    });
  }

  // DELETE /api/tasks/:id - Delete a task
  if (path.match(/^\/api\/tasks\/\d+$/) && method === "DELETE") {
    const params = getPathParams("/api/tasks/:id", url.pathname);
    const id = params.id;

    if (!taskStore.has(id)) {
      return new Response("Task not found", {
        status: 404,
        headers: { ...headers, "Content-Type": "text/plain" }
      });
    }

    // Delete the task
    taskStore.delete(id);

    // Return empty body with 204 status
    return new Response(null, {
      status: 204,
      headers
    });
  }

  // Not found
  return new Response("Not Found", {
    status: 404,
    headers: { ...headers, "Content-Type": "text/plain" }
  });
}

// Helper function to get content type based on file extension
function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };

  return contentTypeMap[ext] || "application/octet-stream";
}

// Initialize
seedTasks();

// Start the server with native Deno.serve API
const port = 8070;
console.log(`Server running on http://localhost:${port}`);
Deno.serve({ port }, handleRequest);