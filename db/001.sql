BEGIN;
CREATE SCHEMA awards;
REVOKE ALL ON SCHEMA awards FROM PUBLIC;
SET LOCAL search_path TO awards, public;

CREATE TABLE event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  edition integer NOT NULL CHECK (edition BETWEEN 2000 AND 9999),
  state text NOT NULL DEFAULT 'upcoming' CHECK (state IN ('upcoming','open','closed','gala','finished')),
  opens_at timestamptz,
  closes_at timestamptz,
  gala_at timestamptz,
  CHECK (opens_at IS NULL OR closes_at IS NULL OR opens_at < closes_at)
);
CREATE TABLE event_settings (
  event_id uuid PRIMARY KEY REFERENCES event,
  intro text NOT NULL DEFAULT '',
  show_percentages boolean NOT NULL DEFAULT false
);
CREATE TABLE participant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES event,
  alias text NOT NULL,
  accessed_at timestamptz,
  UNIQUE (event_id,id)
);
CREATE TABLE access_credential (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participant,
  digest bytea UNIQUE NOT NULL CHECK (octet_length(digest)=32),
  expires_at timestamptz,
  revoked_at timestamptz
);
CREATE UNIQUE INDEX one_current_credential ON access_credential(participant_id) WHERE revoked_at IS NULL;
CREATE TABLE session (
  digest bytea PRIMARY KEY CHECK (octet_length(digest)=32),
  credential_id uuid NOT NULL REFERENCES access_credential,
  expires_at timestamptz NOT NULL
);
CREATE INDEX session_expiry ON session(expires_at);
CREATE TABLE image (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES event,
  content bytea NOT NULL CHECK (octet_length(content) <= 2097152)
);
CREATE TABLE category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES event,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  active boolean NOT NULL DEFAULT false,
  opens_at timestamptz,
  closes_at timestamptz,
  published_at timestamptz,
  UNIQUE (event_id,id),
  CHECK (opens_at IS NULL OR closes_at IS NULL OR opens_at < closes_at)
);
CREATE TABLE nominee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES category,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  media_url text,
  UNIQUE (category_id,id)
);
CREATE TABLE vote (
  event_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  nominee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (participant_id,category_id),
  FOREIGN KEY (event_id,participant_id) REFERENCES participant(event_id,id),
  FOREIGN KEY (event_id,category_id) REFERENCES category(event_id,id),
  FOREIGN KEY (category_id,nominee_id) REFERENCES nominee(category_id,id)
);
CREATE INDEX vote_totals ON vote(category_id,nominee_id);
CREATE FUNCTION prevent_vote_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Votes are immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER immutable_vote BEFORE UPDATE OR DELETE OR TRUNCATE ON vote
FOR EACH STATEMENT EXECUTE FUNCTION prevent_vote_change();

CREATE TABLE admin_user (
  identity_id uuid PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('operator','owner')),
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid REFERENCES event,
  actor_id uuid NOT NULL REFERENCES admin_user,
  action text NOT NULL,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE rate_limit (
  scope text NOT NULL,
  subject text NOT NULL,
  bucket bigint NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY (scope,subject,bucket)
);
COMMIT;

