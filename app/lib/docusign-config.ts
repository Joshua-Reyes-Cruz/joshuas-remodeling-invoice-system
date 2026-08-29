import { env } from "cloudflare:workers";

type DocuSignRuntimeEnv = {
  DOCUSIGN_CLIENT_ID?: string;
  DOCUSIGN_CLIENT_SECRET?: string;
  DOCUSIGN_TOKEN_ENCRYPTION_KEY?: string;
  DOCUSIGN_REDIRECT_URI?: string;
  DOCUSIGN_ENVIRONMENT?: string;
};

export type DocuSignConfig = {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
  redirectUri: string;
  environment: "demo" | "production";
  authBase: string;
};

export function readDocuSignConfig(): DocuSignConfig {
  const runtime = env as unknown as DocuSignRuntimeEnv;
  const environment = runtime.DOCUSIGN_ENVIRONMENT === "production" ? "production" : "demo";
  return {
    clientId: runtime.DOCUSIGN_CLIENT_ID ?? "",
    clientSecret: runtime.DOCUSIGN_CLIENT_SECRET ?? "",
    encryptionKey: runtime.DOCUSIGN_TOKEN_ENCRYPTION_KEY ?? "",
    redirectUri: runtime.DOCUSIGN_REDIRECT_URI ?? "",
    environment,
    authBase: environment === "production" ? "https://account.docusign.com" : "https://account-d.docusign.com",
  };
}

export function missingDocuSignConfig(config = readDocuSignConfig()) {
  const missing: string[] = [];
  if (!config.clientId) missing.push("integration key");
  if (!config.clientSecret) missing.push("client secret");
  if (!config.encryptionKey) missing.push("token encryption key");
  if (!config.redirectUri) missing.push("redirect URI");
  return missing;
}
