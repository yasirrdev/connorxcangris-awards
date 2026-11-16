BEGIN;
INSERT INTO awards.event(slug,name,edition,state)
VALUES ('connorxcangris-awards-2026','ConnorxCangris Awards',2026,'upcoming')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO awards.event_settings(event_id,show_percentages)
SELECT id,false FROM awards.event
WHERE slug='connorxcangris-awards-2026' AND state='upcoming'
ON CONFLICT (event_id) DO NOTHING;
COMMIT;

