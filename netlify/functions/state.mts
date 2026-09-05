import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getUser, verifyRequestOrigin } from "@netlify/identity";

const LEGACY_STATE_ID = "bhms";
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

type AppRecord = Record<string, unknown>;
type AppDocument = Record<string, unknown>;
type LinkDefinition = {
  column: string;
  source: string;
  target: string;
};
type CollectionDefinition = {
  key: string;
  table: string;
  links?: LinkDefinition[];
};

const COLLECTIONS: CollectionDefinition[] = [
  { key: "users", table: "workspace_users" },
  { key: "patients", table: "patients" },
  { key: "pharmacy", table: "medications" },
  { key: "staff", table: "staff" },
  { key: "wards", table: "wards" },
  { key: "ambulances", table: "ambulances" },
  { key: "banks", table: "bank_accounts" },
  { key: "store", table: "inventory_items" },
  { key: "opd", table: "outpatient_visits", links: [{ column: "patient_id", source: "pid", target: "patients" }] },
  { key: "payments", table: "payments", links: [{ column: "patient_id", source: "pid", target: "patients" }] },
  { key: "expenses", table: "expenses" },
  {
    key: "admissions",
    table: "admissions",
    links: [
      { column: "patient_id", source: "pid", target: "patients" },
      { column: "ward_id", source: "ward", target: "wards" },
    ],
  },
  { key: "lab", table: "lab_results", links: [{ column: "patient_id", source: "pid", target: "patients" }] },
  { key: "referrals", table: "referrals", links: [{ column: "patient_id", source: "pid", target: "patients" }] },
  {
    key: "ambTrips",
    table: "ambulance_trips",
    links: [
      { column: "ambulance_id", source: "amb", target: "ambulances" },
      { column: "patient_id", source: "patient", target: "patients" },
    ],
  },
  { key: "leaves", table: "staff_leaves", links: [{ column: "staff_id", source: "eid", target: "staff" }] },
  { key: "bankTx", table: "bank_transactions", links: [{ column: "bank_account_id", source: "bank", target: "banks" }] },
  { key: "messages", table: "messages" },
  { key: "storeMoves", table: "inventory_movements", links: [{ column: "item_id", source: "item", target: "store" }] },
  { key: "audit", table: "audit_logs" },
  { key: "feedback", table: "feedback" },
  { key: "journeys", table: "patient_journeys", links: [{ column: "patient_id", source: "pid", target: "patients" }] },
];

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function asRecord(value: unknown): AppRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as AppRecord
    : null;
}

function prepareCollections(document: AppDocument) {
  const prepared = new Map<string, Array<{ id: string; payload: AppRecord }>>();
  const identifiers = new Map<string, Set<string>>();

  for (const collection of COLLECTIONS) {
    const input = document[collection.key];
    const values = input === undefined ? [] : input;
    if (!Array.isArray(values)) {
      throw new Error(`${collection.key} must be an array`);
    }

    const seen = new Set<string>();
    const records = values.map((value, index) => {
      const payload = asRecord(value);
      if (!payload) throw new Error(`${collection.key}[${index}] must be an object`);
      const id = String(payload.id ?? `${collection.key}-${index + 1}`).trim();
      if (!id || seen.has(id)) throw new Error(`${collection.key} contains an invalid or duplicate id`);
      seen.add(id);
      return { id, payload };
    });

    prepared.set(collection.key, records);
    identifiers.set(collection.key, seen);
  }

  return { prepared, identifiers };
}

async function synchronizeRelationalTables(
  client: { query: (query: string, values?: unknown[]) => Promise<unknown> },
  workspaceId: number,
  document: AppDocument,
) {
  const { prepared, identifiers } = prepareCollections(document);

  for (const collection of [...COLLECTIONS].reverse()) {
    await client.query(`DELETE FROM ${collection.table} WHERE workspace_id = $1`, [workspaceId]);
  }

  for (const collection of COLLECTIONS) {
    const linkColumns = collection.links?.map((link) => link.column) ?? [];
    const columns = ["workspace_id", "record_id", ...linkColumns, "payload"];
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const query = `INSERT INTO ${collection.table} (${columns.join(", ")}) VALUES (${placeholders})`;

    for (const record of prepared.get(collection.key) ?? []) {
      const linkValues = (collection.links ?? []).map((link) => {
        const candidate = String(record.payload[link.source] ?? "").trim();
        return candidate && identifiers.get(link.target)?.has(candidate) ? candidate : null;
      });
      await client.query(query, [workspaceId, record.id, ...linkValues, JSON.stringify(record.payload)]);
    }
  }

  const settings = asRecord(document.settings) ?? {};
  await client.query(
    `INSERT INTO workspace_settings (workspace_id, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (workspace_id) DO UPDATE
     SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [workspaceId, JSON.stringify(settings)],
  );
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

    const document = asRecord(body?.data);
    if (!document) return json({ error: "Missing data" }, 400);

    const serialized = JSON.stringify(document);
    if (Buffer.byteLength(serialized, "utf8") > MAX_DOCUMENT_BYTES) {
      return json({ error: "Data is too large to synchronize" }, 413);
    }

    try {
      prepareCollections(document);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Invalid data" }, 400);
    }

    const baseVersion = Math.max(0, Number(body.baseVersion) || 0);
    const client = await db.pool.connect();
    let saved: { version: number; updatedAt: string } | null = null;

    try {
      await client.query("BEGIN");
      const workspaceResult = await client.query(
        `INSERT INTO hospital_workspaces (owner_id, updated_at)
         VALUES ($1, NOW())
         ON CONFLICT (owner_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [user.id],
      ) as { rows: Array<{ id: number }> };
      const workspaceId = Number(workspaceResult.rows[0].id);

      const stateResult = baseVersion === 0
        ? await client.query(
          `INSERT INTO user_app_state (owner_id, data, version, updated_at)
           VALUES ($1, $2::jsonb, 1, NOW())
           ON CONFLICT (owner_id) DO NOTHING
           RETURNING version, updated_at`,
          [user.id, serialized],
        )
        : await client.query(
          `UPDATE user_app_state
           SET data = $2::jsonb, version = version + 1, updated_at = NOW()
           WHERE owner_id = $1 AND version = $3
           RETURNING version, updated_at`,
          [user.id, serialized, baseVersion],
        );
      const stateRows = (stateResult as { rows: Array<{ version: number; updated_at: string }> }).rows;

      if (!stateRows.length) {
        await client.query("ROLLBACK");
      } else {
        await synchronizeRelationalTables(client, workspaceId, document);
        await client.query("COMMIT");
        saved = {
          version: Number(stateRows[0].version),
          updatedAt: new Date(stateRows[0].updated_at).toISOString(),
        };
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("State synchronization failed", error);
      return json({ error: "Database synchronization failed" }, 500);
    } finally {
      client.release();
    }

    if (!saved) {
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

    return json({ saved: true, version: saved.version, updatedAt: saved.updatedAt });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/state",
};
