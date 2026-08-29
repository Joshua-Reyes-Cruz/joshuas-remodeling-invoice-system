import { env } from "cloudflare:workers";
import { headers } from "next/headers";

const OWNER_HEADER = "oai-authenticated-user-email";
const MAX_WORKSPACE_BYTES = 2_000_000;

async function ownerEmail() {
  const requestHeaders = await headers();
  return requestHeaders.get(OWNER_HEADER);
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected database error";
  if (message.includes("no such table")) {
    return "Workspace storage is still being prepared. Please try again in a moment.";
  }
  return message;
}

export async function GET() {
  const owner = await ownerEmail();
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  try {
    const row = await env.DB.prepare(
      "SELECT payload, updated_at AS updatedAt FROM workspace_states WHERE owner_email = ? LIMIT 1",
    ).bind(owner).first<{ payload: string; updatedAt: string }>();

    if (!row) return Response.json({ workspace: null });
    return Response.json({ workspace: JSON.parse(row.payload), updatedAt: row.updatedAt });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const owner = await ownerEmail();
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  try {
    const workspace = await request.json() as { jobs?: unknown[]; settings?: Record<string, unknown> };
    if (!workspace || !Array.isArray(workspace.jobs)) {
      return Response.json({ error: "A jobs array is required" }, { status: 400 });
    }

    const payload = JSON.stringify(workspace);
    if (new TextEncoder().encode(payload).byteLength > MAX_WORKSPACE_BYTES) {
      return Response.json({ error: "Workspace is too large to save" }, { status: 413 });
    }

    await env.DB.prepare(`
      INSERT INTO workspace_states (owner_email, payload, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(owner_email) DO UPDATE SET
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `).bind(owner, payload).run();

    return Response.json({ saved: true });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
