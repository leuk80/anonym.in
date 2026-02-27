-- Migration: Neuen Status 'bestaetigt' zur CHECK-Constraint der reports-Tabelle hinzufügen
-- Dieser Status wird automatisch gesetzt, wenn der Compliance-Officer den Eingang bestätigt.

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_status_check
    CHECK (status IN ('neu', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen'));
