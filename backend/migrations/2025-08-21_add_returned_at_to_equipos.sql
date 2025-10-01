-- Add returned_at column to equipos to track when an equipment was returned
ALTER TABLE equipos
  ADD COLUMN returned_at DATETIME NULL DEFAULT NULL AFTER updated_at,
  ADD INDEX idx_equipos_returned_at (returned_at);
