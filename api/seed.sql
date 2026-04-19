-- Seed courts
INSERT INTO courts (id, name, sport_type, variant, is_active, created_at) VALUES
  ('court-padel-1', 'Padel Court 1', 'padel', 'regular', 1, 1713398400000),
  ('court-padel-2', 'Padel Court 2', 'padel', 'regular', 1, 1713398400000),
  ('court-padel-3', 'Padel Court 3', 'padel', 'regular', 1, 1713398400000),
  ('court-padel-4', 'Padel Court 4', 'padel', 'regular', 1, 1713398400000),
  ('court-padel-5', 'Padel Court 5', 'padel', 'regular', 1, 1713398400000),
  ('court-padel-6', 'Padel Court 6', 'padel', 'grandstand', 1, 1713398400000),
  ('court-tennis-1', 'Tennis Court 1', 'tennis', NULL, 1, 1713398400000),
  ('court-tennis-2', 'Tennis Court 2', 'tennis', NULL, 1, 1713398400000),
  ('court-badminton-1', 'Badminton Court 1', 'badminton', NULL, 1, 1713398400000),
  ('court-badminton-2', 'Badminton Court 2', 'badminton', NULL, 1, 1713398400000);

-- Seed default admin (password: admin123)
-- Hash generated with PBKDF2-SHA256, 100k iterations
INSERT INTO users (id, username, name, phone_number, password, role, current_points, total_points, created_at) VALUES
  ('admin-001', 'admin', 'Administrator', '0000000000', 'v1:b4c3ae6eab9c6f8acbb0249ebb444ed9:f74a79af597141bfd26606c21a71a99a1ea3df3bae765e78f30944049aea2a94', 'admin', 0, 0, 1713398400000);
