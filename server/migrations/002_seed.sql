-- Seed data for "psps" garden with 18 sessions
-- Pattern hash is a bcrypt hash of "0,1,2,5,4" (demo pattern)

-- Insert psps garden (pattern_hash is bcrypt of "0,1,2,5,4")
INSERT OR IGNORE INTO gardens (garden_id, pattern_hash, created_at) VALUES ('psps', '$2b$10$YourHashHere123456789', datetime('now', '-30 days'));

-- Insert 18 demo sessions for psps garden
INSERT INTO sessions (garden_id, intention, duration_minutes, plant_type, unique_slug, completed_at) VALUES
('psps', 'Deep work on the hardest task', 60, 'rose', 'bloom-soft-petal-x1a2', datetime('now', '-1 days')),
('psps', 'Learning something new', 45, 'sunflower', 'bloom-warm-moss-y3b4', datetime('now', '-1 days', '-3 hours')),
('psps', 'Creative writing session', 90, 'lavender', 'bloom-quiet-fern-z5c6', datetime('now', '-2 days')),
('psps', 'Study without distractions', 30, 'cherry', 'bloom-still-dawn-a7d8', datetime('now', '-3 days')),
('psps', 'Plan the week ahead', 45, 'tulip', 'bloom-bright-meadow-b9e0', datetime('now', '-4 days')),
('psps', 'Read for 30 minutes', 30, 'daisy', 'bloom-gentle-willow-c1f2', datetime('now', '-5 days')),
('psps', 'Practice meditation', 60, 'orchid', 'bloom-wild-sprout-d3g4', datetime('now', '-6 days')),
('psps', 'Work on side project', 120, 'cactus', 'bloom-slow-clover-e5h6', datetime('now', '-7 days')),
('psps', 'Review daily notes', 30, 'peony', 'bloom-honey-garden-f7i8', datetime('now', '-8 days')),
('psps', 'Morning journaling', 45, 'succulent', 'bloom-calm-dusk-g9j0', datetime('now', '-9 days')),
('psps', 'Deep work session', 90, 'fern', 'bloom-soft-moss-h1k2', datetime('now', '-10 days')),
('psps', 'Coding practice', 60, 'lotus', 'bloom-warm-petal-i3l4', datetime('now', '-12 days')),
('psps', 'Reading time', 45, 'rose', 'bloom-quiet-fern-j5m6', datetime('now', '-14 days')),
('psps', 'Creative brainstorming', 60, 'sunflower', 'bloom-still-dawn-k7n8', datetime('now', '-16 days')),
('psps', 'Focus work', 90, 'lavender', 'bloom-bright-moss-l9o0', datetime('now', '-18 days')),
('psps', 'Study session', 45, 'cherry', 'bloom-gentle-clover-m1p2', datetime('now', '-20 days')),
('psps', 'Deep focus work', 120, 'tulip', 'bloom-wild-willow-n3q4', datetime('now', '-25 days')),
('psps', 'Planning session', 60, 'daisy', 'bloom-slow-petal-o5r6', datetime('now', '-30 days'));