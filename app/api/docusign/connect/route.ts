import { env } from "cloudflare:workers";
import { headers } from "next/headers";

import { missingDocuSignConfig, readDocuSignConfig } from "@/app/lib/docusign-config";

export async function GET() {
  const requestHeaders = await headers();
  const owner = requestHeaders.get("oai-authenticated-user-email");
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  const config = readDocuSignConfig();
  const missing = missingDocuSignConfig(config);
  if (missing.length) {
    return Response.json({ error: `DocuSign setup is incomplete: ${missing.join(", ")}` }, { status: 409 });
  }

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO docusign_oauth_states (state, owner_email, expires_at) VALUES (?, ?, ?)",
  ).bind(state, owner, expiresAt).run();

  const authorize = new URL(`${config.authBase}/oauth/auth`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "signature extended");
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("redirect_uri", config.redirectUri);
  authorize.searchParams.set("state", state);
  return Response.redirect(authorize.toString(), 302);
}
