import { env } from "cloudflare:workers";

import { readDocuSignConfig } from "@/app/lib/docusign-config";
import { encryptToken } from "@/app/lib/docusign-crypto";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

type UserInfo = {
  accounts?: Array<{
    account_id: string;
    account_name: string;
    base_uri: string;
    is_default?: boolean;
  }>;
};

function appRedirect(config: ReturnType<typeof readDocuSignConfig>, result: "connected" | "error") {
  const origin = new URL(config.redirectUri).origin;
  return `${origin}/?docusign=${result}`;
}

export async function GET(request: Request) {
  const config = readDocuSignConfig();
  if (!config.clientId || !config.clientSecret || !config.encryptionKey || !config.redirectUri) {
    return Response.json({ error: "DocuSign is not configured" }, { status: 409 });
  }

  const callback = new URL(request.url);
  const code = callback.searchParams.get("code");
  const state = callback.searchParams.get("state");
  if (!code || !state) return Response.redirect(appRedirect(config, "error"), 302);

  const stateRecord = await env.DB.prepare(
    "SELECT owner_email AS ownerEmail, expires_at AS expiresAt FROM docusign_oauth_states WHERE state = ? LIMIT 1",
  ).bind(state).first<{ ownerEmail: string; expiresAt: string }>();
  if (!stateRecord || new Date(stateRecord.expiresAt).getTime() < Date.now()) {
    return Response.redirect(appRedirect(config, "error"), 302);
  }

  const tokenResponse = await fetch(`${config.authBase}/oauth/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  });
  const token = await tokenResponse.json() as TokenResponse;
  if (!tokenResponse.ok || !token.access_token || !token.refresh_token) {
    await env.DB.prepare("DELETE FROM docusign_oauth_states WHERE state = ?").bind(state).run();
    return Response.redirect(appRedirect(config, "error"), 302);
  }

  const userInfoResponse = await fetch(`${config.authBase}/oauth/userinfo`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  const userInfo = await userInfoResponse.json() as UserInfo;
  const account = userInfo.accounts?.find((entry) => entry.is_default) ?? userInfo.accounts?.[0];
  if (!userInfoResponse.ok || !account) {
    await env.DB.prepare("DELETE FROM docusign_oauth_states WHERE state = ?").bind(state).run();
    return Response.redirect(appRedirect(config, "error"), 302);
  }

  const accessTokenEncrypted = await encryptToken(token.access_token, config.encryptionKey);
  const refreshTokenEncrypted = await encryptToken(token.refresh_token, config.encryptionKey);
  const expiresAt = new Date(Date.now() + Math.max(60, token.expires_in ?? 3600) * 1000).toISOString();

  await env.DB.batch([
    env.DB.prepare("DELETE FROM docusign_oauth_states WHERE state = ?").bind(state),
    env.DB.prepare(`
      INSERT INTO docusign_connections
        (owner_email, account_id, account_name, base_uri, access_token_encrypted,
         refresh_token_encrypted, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(owner_email) DO UPDATE SET
        account_id = excluded.account_id,
        account_name = excluded.account_name,
        base_uri = excluded.base_uri,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        expires_at = excluded.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `).bind(stateRecord.ownerEmail, account.account_id, account.account_name, account.base_uri, accessTokenEncrypted, refreshTokenEncrypted, expiresAt),
  ]);

  return Response.redirect(appRedirect(config, "connected"), 302);
}
