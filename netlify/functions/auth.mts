import type { Config, Context } from "@netlify/functions";
import {
  AuthError,
  confirmEmail,
  getUser,
  login,
  logout,
  signup,
  updateUser,
  verifyRequestOrigin,
} from "@netlify/identity";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export default async (req: Request, _context: Context) => {
  if (req.method === "GET") {
    const user = await getUser();
    if (!user) return json({ user: null }, 401);
    return json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles ?? [],
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    verifyRequestOrigin(req);
    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "login") {
      const user = await login(String(body?.email ?? ""), String(body?.password ?? ""));
      return json({ ok: true, confirmed: Boolean(user.confirmedAt) });
    }

    if (action === "signup") {
      const user = await signup(
        String(body?.email ?? ""),
        String(body?.password ?? ""),
        { full_name: String(body?.name ?? "").trim() },
      );
      return json({ ok: true, confirmed: Boolean(user.confirmedAt) }, 201);
    }

    if (action === "confirm") {
      await confirmEmail(String(body?.token ?? ""));
      return json({ ok: true });
    }

    if (action === "logout") {
      await logout();
      return json({ ok: true });
    }

    if (action === "changePassword") {
      const user = await getUser();
      if (!user?.email) return json({ error: "Unauthorized" }, 401);
      await login(user.email, String(body?.currentPassword ?? ""));
      await updateUser({ password: String(body?.newPassword ?? "") });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    if (error instanceof AuthError) {
      return json({ error: error.message }, error.status ?? 400);
    }
    return json({ error: "Authentication request failed" }, 400);
  }
};

export const config: Config = {
  path: "/api/auth",
};
