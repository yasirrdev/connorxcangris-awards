BEGIN;
INSERT INTO awards.event(slug,name,edition) VALUES ('demo-2026','ConnorxCangris Awards',2026);
INSERT INTO awards.event_settings(event_id,intro)
SELECT id,'Una gala privada para nuestra comunidad. Edición de demostración con candidaturas ficticias.' FROM awards.event WHERE slug='demo-2026';
INSERT INTO awards.category(event_id,name,description,active)
SELECT id,'Meme del año','Categoría de demostración con datos ficticios.',true FROM awards.event WHERE slug='demo-2026';
INSERT INTO awards.nominee(category_id,name,description)
SELECT c.id,'Candidatura ficticia ' || i,'Contenido provisional de demostración.'
FROM awards.category c JOIN awards.event e ON e.id=c.event_id CROSS JOIN generate_series(1,2) i WHERE e.slug='demo-2026';
COMMIT;

