-- Preserve the legacy shared document so existing installations can migrate
-- into an authenticated workspace without losing data.
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE hospital_workspaces (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_app_state (
  owner_id TEXT PRIMARY KEY REFERENCES hospital_workspaces(owner_id) ON DELETE CASCADE,
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_users (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE patients (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE medications (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE staff (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE wards (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE ambulances (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE bank_accounts (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE inventory_items (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE outpatient_visits (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  patient_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, record_id) ON DELETE SET NULL (patient_id)
);

CREATE TABLE payments (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  patient_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, record_id) ON DELETE SET NULL (patient_id)
);

CREATE TABLE expenses (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE admissions (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  patient_id TEXT,
  ward_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, record_id) ON DELETE SET NULL (patient_id),
  FOREIGN KEY (workspace_id, ward_id) REFERENCES wards(workspace_id, record_id) ON DELETE SET NULL (ward_id)
);

CREATE TABLE lab_results (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  patient_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, record_id) ON DELETE SET NULL (patient_id)
);

CREATE TABLE referrals (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  patient_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, record_id) ON DELETE SET NULL (patient_id)
);

CREATE TABLE ambulance_trips (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  ambulance_id TEXT,
  patient_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, ambulance_id) REFERENCES ambulances(workspace_id, record_id) ON DELETE SET NULL (ambulance_id),
  FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, record_id) ON DELETE SET NULL (patient_id)
);

CREATE TABLE staff_leaves (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  staff_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, staff_id) REFERENCES staff(workspace_id, record_id) ON DELETE SET NULL (staff_id)
);

CREATE TABLE bank_transactions (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  bank_account_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, bank_account_id) REFERENCES bank_accounts(workspace_id, record_id) ON DELETE SET NULL (bank_account_id)
);

CREATE TABLE messages (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE inventory_movements (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  item_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, item_id) REFERENCES inventory_items(workspace_id, record_id) ON DELETE SET NULL (item_id)
);

CREATE TABLE audit_logs (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE feedback (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id)
);

CREATE TABLE patient_journeys (
  workspace_id BIGINT NOT NULL REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  patient_id TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, record_id),
  FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, record_id) ON DELETE SET NULL (patient_id)
);

CREATE TABLE workspace_settings (
  workspace_id BIGINT PRIMARY KEY REFERENCES hospital_workspaces(id) ON DELETE CASCADE,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_app_state_updated_at_idx ON user_app_state (updated_at DESC);
CREATE INDEX patients_updated_at_idx ON patients (workspace_id, updated_at DESC);
CREATE INDEX outpatient_visits_patient_idx ON outpatient_visits (workspace_id, patient_id);
CREATE INDEX payments_patient_idx ON payments (workspace_id, patient_id);
CREATE INDEX admissions_patient_idx ON admissions (workspace_id, patient_id);
CREATE INDEX admissions_ward_idx ON admissions (workspace_id, ward_id);
CREATE INDEX lab_results_patient_idx ON lab_results (workspace_id, patient_id);
CREATE INDEX referrals_patient_idx ON referrals (workspace_id, patient_id);
CREATE INDEX ambulance_trips_ambulance_idx ON ambulance_trips (workspace_id, ambulance_id);
CREATE INDEX staff_leaves_staff_idx ON staff_leaves (workspace_id, staff_id);
CREATE INDEX bank_transactions_account_idx ON bank_transactions (workspace_id, bank_account_id);
CREATE INDEX inventory_movements_item_idx ON inventory_movements (workspace_id, item_id);
CREATE INDEX patient_journeys_patient_idx ON patient_journeys (workspace_id, patient_id);
CREATE INDEX messages_updated_at_idx ON messages (workspace_id, updated_at DESC);
CREATE INDEX audit_logs_updated_at_idx ON audit_logs (workspace_id, updated_at DESC);

REVOKE ALL ON TABLE
  app_state, hospital_workspaces, user_app_state, workspace_users, patients,
  medications, staff, wards, ambulances, bank_accounts, inventory_items,
  outpatient_visits, payments, expenses, admissions, lab_results, referrals,
  ambulance_trips, staff_leaves, bank_transactions, messages,
  inventory_movements, audit_logs, feedback, patient_journeys,
  workspace_settings
FROM PUBLIC;

-- Abort the migration if basic create/read/update/delete behavior or cascading
-- cleanup is not working. The synthetic records are removed before completion.
DO $$
DECLARE
  test_workspace_id BIGINT;
  test_payload JSONB;
BEGIN
  INSERT INTO hospital_workspaces (owner_id)
  VALUES ('__migration_crud_check__')
  RETURNING id INTO test_workspace_id;

  INSERT INTO user_app_state (owner_id, data)
  VALUES ('__migration_crud_check__', '{"status":"created"}'::jsonb);

  INSERT INTO patients (workspace_id, record_id, payload)
  VALUES (test_workspace_id, 'TEST-PATIENT', '{"id":"TEST-PATIENT","status":"created"}'::jsonb);

  UPDATE patients
  SET payload = jsonb_set(payload, '{status}', '"updated"'::jsonb)
  WHERE workspace_id = test_workspace_id AND record_id = 'TEST-PATIENT';

  SELECT payload INTO test_payload
  FROM patients
  WHERE workspace_id = test_workspace_id AND record_id = 'TEST-PATIENT';

  IF test_payload ->> 'status' <> 'updated' THEN
    RAISE EXCEPTION 'Database CRUD verification failed';
  END IF;

  DELETE FROM hospital_workspaces WHERE id = test_workspace_id;

  IF EXISTS (SELECT 1 FROM patients WHERE workspace_id = test_workspace_id)
    OR EXISTS (SELECT 1 FROM user_app_state WHERE owner_id = '__migration_crud_check__') THEN
    RAISE EXCEPTION 'Database cascade verification failed';
  END IF;
END $$;
