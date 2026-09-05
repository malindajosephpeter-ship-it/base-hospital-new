import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getUser, verifyRequestOrigin } from "@netlify/identity";

const LEGACY_STATE_ID = "bhms";
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export default async (req: Request, _context: Context) => {
  const user = await getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const db = getDatabase();

  if (req.method === "GET") {
    const rows = await db.sql`
      SELECT data, version, updated_at
      FROM user_app_state
      WHERE owner_id = ${user.id}
    `;

    if (rows.length) {
      return json({
        data: rows[0].data,
        version: Number(rows[0].version),
        updatedAt: new Date(rows[0].updated_at as string).toISOString(),
        persisted: true,
      });
    }

    const legacy = await db.sql`
      SELECT data, updated_at
      FROM app_state
      WHERE id = ${LEGACY_STATE_ID}
    `;

    return json({
      data: legacy.length ? legacy[0].data : null,
      version: 0,
      updatedAt: legacy.length ? Number(legacy[0].updated_at) : 0,
      persisted: false,
    });
  }

  if (req.method === "PUT" || req.method === "POST") {
    try {
      verifyRequestOrigin(req);
    } catch {
      return json({ error: "Invalid request origin" }, 403);
    }

    let body: { data?: unknown; baseVersion?: number };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!body?.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return json({ error: "Missing data" }, 400);
    }

    const serialized = JSON.stringify(body.data);
    if (Buffer.byteLength(serialized, "utf8") > MAX_DOCUMENT_BYTES) {
      return json({ error: "Data is too large to synchronize" }, 413);
    }

    const baseVersion = Math.max(0, Number(body.baseVersion) || 0);
    let rows;

    if (baseVersion === 0) {
      rows = await db.sql`
        INSERT INTO user_app_state (owner_id, data, version, updated_at)
        VALUES (${user.id}, ${serialized}::jsonb, 1, NOW())
        ON CONFLICT (owner_id) DO NOTHING
        RETURNING version, updated_at
      `;
    } else {
      rows = await db.sql`
        UPDATE user_app_state
        SET data = ${serialized}::jsonb,
            version = version + 1,
            updated_at = NOW()
        WHERE owner_id = ${user.id}
          AND version = ${baseVersion}
        RETURNING version, updated_at
      `;
    }

    if (!rows.length) {
      const current = await db.sql`
        SELECT data, version, updated_at
        FROM user_app_state
        WHERE owner_id = ${user.id}
      `;
      if (!current.length) return json({ error: "State unavailable" }, 409);
      return json({
        conflict: true,
        data: current[0].data,
        version: Number(current[0].version),
        updatedAt: new Date(current[0].updated_at as string).toISOString(),
      }, 409);
    }

    return json({
      saved: true,
      version: Number(rows[0].version),
      updatedAt: new Date(rows[0].updated_at as string).toISOString(),
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/state",
};
