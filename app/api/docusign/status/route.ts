import { env } from "cloudflare:workers";
import { headers } from "next/headers";

import { missingDocuSignConfig, readDocuSignConfig } from "@/app/lib/docusign-config";

export async function GET() {
  const requestHeaders = await headers();
  const owner = requestHeaders.get("oai-authenticated-user-email");
  if (!owner) return Response.json({ error: "Authentication required" }, { status: 401 });

  const config = readDocuSignConfig();
  const missing = missingDocuSignConfig(config);
  const connection = await env.DB.prepare(`
    SELECT account_id AS accountId, account_name AS accountName,
      expires_at AS expiresAt, connected_at AS connectedAt
    FROM docusign_connections WHERE owner_email = ? LIMIT 1
  `).bind(owner).first<{ accountId: string; accountName: string; expiresAt: string; connectedAt: string }>();

  return Response.json({
    configured: missing.length === 0,
    missing,
    environment: config.environment,
    redirectUri: config.redirectUri || null,
    connected: Boolean(connection),
    connection: connection ?? null,
  });
}
