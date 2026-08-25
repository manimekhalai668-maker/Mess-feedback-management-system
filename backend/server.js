import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'db', 'database.sqlite');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`Connecting to SQLite DB at: ${dbPath}`);
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    roll_no TEXT UNIQUE NOT NULL,
    room_no TEXT,
    pin TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    dish_names TEXT NOT NULL,
    UNIQUE(date, meal_type)
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    wastage_level TEXT NOT NULL,
    comment TEXT,
    submitted_at TEXT,
    UNIQUE(student_id, menu_id),
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(menu_id) REFERENCES menu(id)
  );
`);

const studentCount = db.prepare('SELECT COUNT(*) as c FROM students').get();
if (studentCount.c === 0) {
  console.log('Seeding students...');
  db.prepare(`INSERT INTO students (name, roll_no, room_no, pin) VALUES (?, ?, ?, ?)`).run('Test Student', 'es24ad76', '101', '123456');
}

const today = new Date().toLocaleDateString('en-CA');
const menuCount = db.prepare('SELECT COUNT(*) as c FROM menu WHERE date = ?').get(today);
if (menuCount.c === 0) {
  console.log(`Seeding menu for ${today}...`);
  db.prepare(`INSERT INTO menu (date, meal_type, dish_names) VALUES (?, ?, ?)`).run(today, 'breakfast', 'Idli, Sambar, Coconut Chutney');
  db.prepare(`INSERT INTO menu (date, meal_type, dish_names) VALUES (?, ?, ?)`).run(today, 'lunch', 'Rice, Dal, Curd, Veg Curry');
  db.prepare(`INSERT INTO menu (date, meal_type, dish_names) VALUES (?, ?, ?)`).run(today, 'dinner', 'Chapati, Chicken Curry, Salad');
}

app.get('/', (req, res) => {
  res.json({ status: 'online', message: 'Hostel Mess Menu & Feedback System API is running successfully.' });
});

app.post('/api/auth/login', (req, res) => {
  const { roll_no, pin } = req.body;
  if (!roll_no || !pin) return res.status(400).json({ error: 'Roll number and PIN are required.' });
  try {
    const student = db.prepare(`SELECT id, name, roll_no, room_no FROM students WHERE roll_no = ? COLLATE NOCASE AND pin = ?`).get(roll_no, pin);
    if (!student) return res.status(401).json({ error: 'Invalid Roll Number or PIN.' });
    res.json({ student });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

app.get('/api/menu/today', (req, res) => {
  const today = new Date().toLocaleDateString('en-CA');
  try {
    const menus = db.prepare('SELECT * FROM menu WHERE date = ?').all(today);
    res.json({ date: today, meals: menus });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching menu.' });
  }
});

app.get('/api/menu', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date query parameter is required.' });
  try {
    const menus = db.prepare('SELECT * FROM menu WHERE date = ?').all(date);
    res.json({ date, meals: menus });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching menu.' });
  }
});

app.post('/api/menu', (req, res) => {
  const { date, meal_type, dish_names } = req.body;
  if (!date || !meal_type || !dish_names) return res.status(400).json({ error: 'Date, meal_type, and dish_names are required.' });
  try {
    const info = db.prepare(`INSERT INTO menu (date, meal_type, dish_names) VALUES (?, ?, ?) ON CONFLICT(date, meal_type) DO UPDATE SET dish_names = excluded.dish_names`).run(date, meal_type.toLowerCase(), dish_names.trim());
    res.json({ message: 'Menu entry saved successfully.', id: info.lastInsertRowid || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error saving menu.' });
  }
});

app.post('/api/feedback', (req, res) => {
  const { student_id, menu_id, rating, wastage_level, comment } = req.body;
  if (student_id === undefined || menu_id === undefined || rating === undefined || !wastage_level) return res.status(400).json({ error: 'student_id, menu_id, rating, and wastage_level are required.' });
  const ratingVal = parseInt(rating, 10);
  if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) return res.status(400).json({ error: 'Rating must be 1-5.' });
  try {
    const stmt = db.prepare(`INSERT INTO feedback (student_id, menu_id, rating, wastage_level, comment, submitted_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`);
    const info = stmt.run(student_id, menu_id, ratingVal, wastage_level, comment ? comment.trim() : null);
    res.status(201).json({ message: 'Feedback submitted successfully.', feedbackId: info.lastInsertRowid });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'You have already submitted feedback for this meal.' });
    res.status(500).json({ error: 'Server error submitting feedback.' });
  }
});

app.get('/api/feedback/menu/:menuId', (req, res) => {
  const { menuId } = req.params;
  try {
    const feedbacks = db.prepare(`SELECT f.*, s.name, s.roll_no, s.room_no FROM feedback f JOIN students s ON f.student_id = s.id WHERE f.menu_id = ? ORDER BY f.submitted_at DESC`).all(menuId);
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching feedback.' });
  }
});

app.get('/api/analytics/summary', (req, res) => {
  try {
    const overall = db.prepare(`SELECT COUNT(*) as total_responses, AVG(rating) as avg_rating FROM feedback`).get();
    const wastage = db.prepare(`SELECT CASE WHEN COUNT(*) = 0 THEN 0.0 ELSE (COUNT(CASE WHEN wastage_level IN ('some', 'a_lot') THEN 1 END) * 100.0 / COUNT(*)) END AS wastage_percent FROM feedback`).get();
    const bestDish = db.prepare(`SELECT m.dish_names, AVG(f.rating) as avg_rating FROM feedback f JOIN menu m ON f.menu_id = m.id GROUP BY m.dish_names ORDER BY avg_rating DESC LIMIT 1`).get();
    const worstDish = db.prepare(`SELECT m.dish_names, AVG(f.rating) as avg_rating FROM feedback f JOIN menu m ON f.menu_id = m.id GROUP BY m.dish_names ORDER BY avg_rating ASC LIMIT 1`).get();
    res.json({ avgRating: overall.avg_rating ? parseFloat(overall.avg_rating.toFixed(2)) : 0, totalResponses: overall.total_responses || 0, wastagePercent: wastage.wastage_percent ? parseFloat(wastage.wastage_percent.toFixed(1)) : 0, bestDish: bestDish || { dish_names: 'N/A', avg_rating: 0 }, worstDish: worstDish || { dish_names: 'N/A', avg_rating: 0 } });
  } catch (err) {
    res.status(500).json({ error: 'Server error generating summary.' });
  }
});

app.get('/api/analytics/dish-ratings', (req, res) => {
  try {
    const list = db.prepare(`SELECT m.dish_names, AVG(f.rating) AS avg_rating, COUNT(f.id) AS response_count FROM feedback f JOIN menu m ON f.menu_id = m.id GROUP BY m.dish_names ORDER BY avg_rating DESC`).all();
    res.json(list.map(item => ({ ...item, avg_rating: parseFloat(item.avg_rating.toFixed(2)) })));
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

app.get('/api/analytics/wastage-by-day', (req, res) => {
  try {
    const list = db.prepare(`SELECT CASE strftime('%w', m.date) WHEN '0' THEN 'Sunday' WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday' WHEN '3' THEN 'Wednesday' WHEN '4' THEN 'Thursday' WHEN '5' THEN 'Friday' WHEN '6' THEN 'Saturday' END AS day_name, COUNT(CASE WHEN f.wastage_level = 'none' THEN 1 END) AS none, COUNT(CASE WHEN f.wastage_level = 'some' THEN 1 END) AS some, COUNT(CASE WHEN f.wastage_level = 'a_lot' THEN 1 END) AS a_lot, strftime('%w', m.date) as weekday_idx FROM feedback f JOIN menu m ON f.menu_id = m.id GROUP BY weekday_idx ORDER BY (strftime('%w', m.date) + 6) % 7`).all();
    res.json(list);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

app.get('/api/analytics/rating-trend', (req, res) => {
  try {
    const list = db.prepare(`SELECT m.date, AVG(f.rating) AS avg_rating FROM feedback f JOIN menu m ON f.menu_id = m.id GROUP BY m.date ORDER BY m.date ASC`).all();
    res.json(list.map(item => ({ ...item, avg_rating: parseFloat(item.avg_rating.toFixed(2)) })));
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

app.get('/api/analytics/attendance-correlation', (req, res) => {
  try {
    const list = db.prepare(`SELECT m.date, m.meal_type, m.dish_names, AVG(f.rating) AS avg_rating, COUNT(f.id) AS response_count FROM feedback f JOIN menu m ON f.menu_id = m.id GROUP BY m.id ORDER BY m.date ASC, m.meal_type ASC`).all();
    res.json(list.map(item => ({ ...item, avg_rating: parseFloat(item.avg_rating.toFixed(2)) })));
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

app.listen(PORT, () => {
  console.log(`Hostel Mess API server listening on port ${PORT}`);
});