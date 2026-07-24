CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type TEXT
);

INSERT INTO files (name, size_bytes, mime_type)
VALUES ('texte-simple.txt', 512, 'text/plain');