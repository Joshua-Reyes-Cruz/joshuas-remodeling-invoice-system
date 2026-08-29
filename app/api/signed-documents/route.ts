import { env } from "cloudflare:workers";
import { headers } from "next/headers";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function ownerEmail() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-email");
}

export async function POST(request: Request) {
  const owner = await ownerEmail();
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const documentId = String(form.get("documentId") ?? "").trim();
    if (!(file instanceof File) || !documentId) {
      return Response.json({ error: "A PDF and document ID are required" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return Response.json({ error: "Only PDF files are accepted" }, { status: 415 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json({ error: "PDF must be 10 MB or smaller" }, { status: 413 });
    }

    const objectKey = `signed/${owner}/${documentId}/${crypto.randomUUID()}.pdf`;
    await env.BUCKET.put(objectKey, file.stream(), {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { documentId, owner },
    });
    await env.DB.prepare(`
      INSERT INTO stored_documents
        (owner_email, document_id, object_key, filename, content_type, size_bytes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(owner, documentId, objectKey, file.name, file.type, file.size, "manual").run();

    return Response.json({ stored: true, filename: file.name }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store signed PDF";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const owner = await ownerEmail();
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  const documentId = new URL(request.url).searchParams.get("documentId")?.trim();
  if (!documentId) return Response.json({ error: "documentId is required" }, { status: 400 });

  const record = await env.DB.prepare(`
    SELECT object_key AS objectKey, filename, content_type AS contentType
    FROM stored_documents
    WHERE owner_email = ? AND document_id = ?
    ORDER BY id DESC LIMIT 1
  `).bind(owner, documentId).first<{ objectKey: string; filename: string; contentType: string }>();
  if (!record) return Response.json({ error: "Signed document not found" }, { status: 404 });

  const object = await env.BUCKET.get(record.objectKey);
  if (!object) return Response.json({ error: "Signed document file is unavailable" }, { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": record.contentType,
      "content-disposition": `attachment; filename="${record.filename.replaceAll('"', "")}"`,
    },
  });
}
