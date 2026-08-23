-- AGI Ecosystem Event Store Schema
-- Immutable append-only log with cryptographic chaining

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Events table: append-only, immutable
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_number BIGSERIAL UNIQUE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    dag_id UUID,
    agent_id UUID,
    session_id UUID,

    -- Cryptographic verification
    CONSTRAINT valid_hash CHECK (hash ~ '^[a-f0-9]{64}$'),
    CONSTRAINT valid_previous_hash CHECK (previous_hash ~ '^[a-f0-9]{64}$')
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_dag ON events(dag_id);
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_sequence ON events(sequence_number);

-- GIN index for JSONB payload queries
CREATE INDEX IF NOT EXISTS idx_events_payload ON events USING GIN(payload);

-- Immutable check: prevent updates/deletes
CREATE OR REPLACE FUNCTION prevent_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Events are immutable: operation % on table % is forbidden', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_immutable ON events;
CREATE TRIGGER event_immutable
    BEFORE UPDATE OR DELETE ON events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_event_mutation();

-- Audit log for schema changes
CREATE TABLE IF NOT EXISTS schema_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action VARCHAR(32) NOT NULL,
    table_name VARCHAR(128) NOT NULL,
    details JSONB
);

-- Event streams for replay
CREATE TABLE IF NOT EXISTS event_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(256) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sequence BIGINT NOT NULL DEFAULT 0,
    metadata JSONB
);

-- Snapshots for fast replay
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES event_streams(id),
    sequence_number BIGINT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(stream_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_stream ON snapshots(stream_id, sequence_number DESC);
