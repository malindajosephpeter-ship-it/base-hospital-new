import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

// Kitambulisho cha hati moja inayoshirikiwa na vifaa vyote (hospitali moja).
const STATE_ID = "bhms";

export default async (req: Request, _context: Context) => {
  const db = getDatabase();

  // GET: rudisha hali iliyohifadhiwa pamoja na muhuri wa muda (_ts).
  if (req.method === "GET") {
    const rows = await db.sql`
      SELECT data, updated_at FROM app_state WHERE id = ${STATE_ID}
    `;
    if (!rows.length) {
      return Response.json({ data: null, ts: 0 });
    }
    return Response.json({ data: rows[0].data, ts: Number(rows[0].updated_at) });
  }

  // PUT/POST: hifadhi hali mpya. Last-write-wins kwa kutumia muhuri wa muda.
  if (req.method === "PUT" || req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const data = body?.data;
    const ts = Number(body?.ts) || 0;
    if (data == null || typeof data !== "object") {
      return new Response("Missing data", { status: 400 });
    }

    const json = JSON.stringify(data);
    // Andika tu ikiwa hati inayoingia ni mpya kuliko au sawa na iliyopo,
    // ili kifaa chenye nakala ya zamani kisifute mabadiliko mapya.
    const rows = await db.sql`
      INSERT INTO app_state (id, data, updated_at)
      VALUES (${STATE_ID}, ${json}::jsonb, ${ts})
      ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
        WHERE EXCLUDED.updated_at >= app_state.updated_at
      RETURNING updated_at
    `;

    let storedTs = ts;
    let applied = rows.length > 0;
    if (!applied) {
      // Ombi limekataliwa kwa kuwa seva ina toleo jipya zaidi; rudisha muhuri wake.
      const cur = await db.sql`
        SELECT updated_at FROM app_state WHERE id = ${STATE_ID}
      `;
      storedTs = cur.length ? Number(cur[0].updated_at) : ts;
    } else {
      storedTs = Number(rows[0].updated_at);
    }

    return Response.json({ ts: storedTs, applied });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/state",
};
