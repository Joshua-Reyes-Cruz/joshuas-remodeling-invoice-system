import { env } from "cloudflare:workers";
import { headers } from "next/headers";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function ownerEmail() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-email");
}

function logoKey(owner: string) {
  return `branding/${encodeURIComponent(owner)}/company-logo`;
}

export async function POST(request: Request) {
  const owner = await ownerEmail();
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a logo file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ error: "Use a PNG, JPG, or WebP logo" }, { status: 415 });
    }
    if (file.size > MAX_LOGO_BYTES) {
      return Response.json({ error: "Logo must be 5 MB or smaller" }, { status: 413 });
    }

    await env.BUCKET.put(logoKey(owner), file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "private, max-age=31536000, immutable" },
      customMetadata: { owner, originalFilename: file.name },
    });

    return Response.json({ logoUrl: `/api/logo?v=${Date.now()}` }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logo could not be saved";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const owner = await ownerEmail();
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  const object = await env.BUCKET.get(logoKey(owner));
  if (!object) return Response.json({ error: "Logo not found" }, { status: 404 });

  const responseHeaders = new Headers();
  object.writeHttpMetadata(responseHeaders);
  responseHeaders.set("etag", object.httpEtag);
  return new Response(object.body, { headers: responseHeaders });
}
