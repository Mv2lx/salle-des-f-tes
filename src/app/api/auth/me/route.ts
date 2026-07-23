import { getSession } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ user: null }, { status: 200 });
  }
  return Response.json({
    user: { name: session.name, username: session.username, role: session.role },
  });
}
