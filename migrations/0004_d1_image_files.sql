ALTER TABLE web_messages ADD COLUMN file_data BLOB;
ALTER TABLE web_messages DROP COLUMN file_key;
