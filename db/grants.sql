-- Crear awards_runtime como rol LOGIN sin privilegios administrativos antes de ejecutar.
GRANT USAGE ON SCHEMA awards TO awards_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA awards TO awards_runtime;
GRANT INSERT ON awards.participant,awards.access_credential,awards.session,awards.vote,awards.category,awards.nominee,awards.image,awards.audit_log,awards.event_settings,awards.rate_limit TO awards_runtime;
GRANT UPDATE ON awards.event,awards.category,awards.nominee,awards.event_settings,awards.rate_limit TO awards_runtime;
GRANT UPDATE (accessed_at) ON awards.participant TO awards_runtime;
GRANT UPDATE (revoked_at) ON awards.access_credential TO awards_runtime;
GRANT DELETE ON awards.session TO awards_runtime;
GRANT USAGE ON SEQUENCE awards.audit_log_id_seq TO awards_runtime;


GRANT UPDATE (expires_at) ON awards.session TO awards_runtime;
