import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

const STATE_ID = "bhms";
const MAX_STATE_BYTES = 8 * 1024 * 1024;

const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });

export default async (req: Request, _context: Context) => {
  const database = getDatabase();

  try {
    if (req.method === "GET") {
      const rows = await database.sql`
        SELECT data, updated_at FROM app_state WHERE id = ${STATE_ID}
      `;

      if (!rows.length) return jsonResponse({ data: null, ts: 0 });

      return jsonResponse({
        data: rows[0].data,
        ts: Number(rows[0].updated_at),
      });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const rawBody = await req.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_STATE_BYTES) {
        return jsonResponse({ error: "State is too large" }, 413);
      }

      let body: { data?: unknown; ts?: unknown };
      try {
        body = JSON.parse(rawBody);
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400);
      }

      if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
        return jsonResponse({ error: "Missing data" }, 400);
      }

      const requestedTimestamp = Number(body.ts);
      const timestamp = Number.isSafeInteger(requestedTimestamp) && requestedTimestamp > 0
        ? requestedTimestamp
        : Date.now();
      const serializedData = JSON.stringify(body.data);

      const rows = await database.sql`
        INSERT INTO app_state (id, data, updated_at)
        VALUES (${STATE_ID}, ${serializedData}::jsonb, ${timestamp})
        ON CONFLICT (id) DO UPDATE
          SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
          WHERE EXCLUDED.updated_at >= app_state.updated_at
        RETURNING updated_at
      `;

      if (rows.length) {
        return jsonResponse({ ts: Number(rows[0].updated_at), applied: true });
      }

      const current = await database.sql`
        SELECT updated_at FROM app_state WHERE id = ${STATE_ID}
      `;

      return jsonResponse({
        ts: current.length ? Number(current[0].updated_at) : timestamp,
        applied: false,
      });
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, PUT, POST" },
    });
  } catch (error) {
    console.error("Unable to access shared application state", error);
    return jsonResponse({ error: "Unable to access shared application state" }, 500);
  }
};

export const config: Config = {
  path: "/api/state",
};
