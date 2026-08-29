import { getChatGPTUser } from "./chatgpt-auth";
import InvoiceApp from "./invoice-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <InvoiceApp displayName={user?.fullName?.split(" ")[0] ?? "Joshua"} />;
}
