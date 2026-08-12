import express from 'express';
import cors from 'cors';
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

// Open Database Connection
console.log(`Connecting to SQLite DB at: ${dbPath}`);
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

// Root endpoint for status check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Hostel Mess Menu & Feedback System API is running successfully.',
    frontend_url: 'http://localhost:5173'
  });
});

// 1. Auth Endpoint
app.post('/api/auth/login', (req, res) => {
  const { roll_no, pin } = req.body;
  if (!roll_no || !pin) {
    return res.status(400).json({ error: 'Roll number and PIN are required.' });
  }

  try {
    const student = db.prepare(`
      SELECT id, name, roll_no, room_no
      FROM students
      WHERE roll_no = ? COLLATE NOCASE AND pin = ?
    `).get(roll_no, pin);

    if (!student) {
      return res.status(401).json({ error: 'Invalid Roll Number or PIN.' });
    }

    res.json({ student });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// 2. Menu Endpoints
// GET today's menu
app.get('/api/menu/today', (req, res) => {
  // Use local time date
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  try {
    const menus = db.prepare('SELECT * FROM menu WHERE date = ?').all(today);
    res.json({ date: today, meals: menus });
  } catch (err) {
    console.error('Error fetching today menu:', err);
    res.status(500).json({ error: 'Server error fetching menu.' });
  }
});

// GET menu for a specific date
app.get('/api/menu', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Date query parameter is required (YYYY-MM-DD).' });
  }

  try {
    const menus = db.prepare('SELECT * FROM menu WHERE date = ?').all(date);
    res.json({ date, meals: menus });
  } catch (err) {
    console.error(`Error fetching menu for ${date}:`, err);
    res.status(500).json({ error: 'Server error fetching menu.' });
  }
});

// POST menu: Create or update menu slot
app.post('/api/menu', (req, res) => {
  const { date, meal_type, dish_names } = req.body;

  if (!date || !meal_type || !dish_names) {
    return res.status(400).json({ error: 'Date, meal_type, and dish_names are required.' });
  }

  if (!['breakfast', 'lunch', 'dinner'].includes(meal_type.toLowerCase())) {
    return res.status(400).json({ error: "meal_type must be one of 'breakfast', 'lunch', or 'dinner'." });
  }

  try {
    const info = db.prepare(`
      INSERT INTO menu (date, meal_type, dish_names)
      VALUES (?, ?, ?)
      ON CONFLICT(date, meal_type)
      DO UPDATE SET dish_names = excluded.dish_names
    `).run(date, meal_type.toLowerCase(), dish_names.trim());

    res.json({
      message: 'Menu entry saved successfully.',
      id: info.lastInsertRowid || null
    });
  } catch (err) {
    console.error('Error saving menu:', err);
    res.status(500).json({ error: 'Server error saving menu.' });
  }
});

// 3. Feedback Endpoints
// POST feedback
app.post('/api/feedback', (req, res) => {
  const { student_id, menu_id, rating, wastage_level, comment } = req.body;

  // Validation
  if (student_id === undefined || menu_id === undefined || rating === undefined || !wastage_level) {
    return res.status(400).json({ error: 'student_id, menu_id, rating, and wastage_level are required.' });
  }

  const ratingVal = parseInt(rating, 10);
  if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }

  const allowedWastage = ['none', 'some', 'a_lot'];
  if (!allowedWastage.includes(wastage_level)) {
    return res.status(400).json({ error: "wastage_level must be one of 'none', 'some', or 'a_lot'." });
  }

  try {
    // Check if student exists
    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Check if menu exists
    const menu = db.prepare('SELECT id FROM menu WHERE id = ?').get(menu_id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu slot not found.' });
    }

    // Insert feedback
    const stmt = db.prepare(`
      INSERT INTO feedback (student_id, menu_id, rating, wastage_level, comment, submitted_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(student_id, menu_id, ratingVal, wastage_level, comment ? comment.trim() : null);

    res.status(201).json({
      message: 'Feedback submitted successfully.',
      feedbackId: info.lastInsertRowid
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'You have already submitted feedback for this meal.' });
    }
    console.error('Error submitting feedback:', err);
    res.status(500).json({ error: 'Server error submitting feedback.' });
  }
});

// GET all feedback for one meal slot
app.get('/api/feedback/menu/:menuId', (req, res) => {
  const { menuId } = req.params;
  try {
    const feedbacks = db.prepare(`
      SELECT f.*, s.name, s.roll_no, s.room_no
      FROM feedback f
      JOIN students s ON f.student_id = s.id
      WHERE f.menu_id = ?
      ORDER BY f.submitted_at DESC
    `).all(menuId);

    res.json(feedbacks);
  } catch (err) {
    console.error(`Error fetching feedback for menu ${menuId}:`, err);
    res.status(500).json({ error: 'Server error fetching feedback.' });
  }
});

// 4. Analytics Endpoints
// GET /api/analytics/summary
app.get('/api/analytics/summary', (req, res) => {
  try {
    // 1. Overall Avg Rating & Responses Count
    const overall = db.prepare(`
      SELECT COUNT(*) as total_responses, AVG(rating) as avg_rating
      FROM feedback
    `).get();

    // 2. Wastage percentage
    const wastage = db.prepare(`
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0.0
          ELSE (COUNT(CASE WHEN wastage_level IN ('some', 'a_lot') THEN 1 END) * 100.0 / COUNT(*))
        END AS wastage_percent
      FROM feedback
    `).get();

    // 3. Best Dish
    const bestDish = db.prepare(`
      SELECT m.dish_names, AVG(f.rating) as avg_rating
      FROM feedback f
      JOIN menu m ON f.menu_id = m.id
      GROUP BY m.dish_names
      ORDER BY avg_rating DESC
      LIMIT 1
    `).get();

    // 4. Worst Dish
    const worstDish = db.prepare(`
      SELECT m.dish_names, AVG(f.rating) as avg_rating
      FROM feedback f
      JOIN menu m ON f.menu_id = m.id
      GROUP BY m.dish_names
      ORDER BY avg_rating ASC
      LIMIT 1
    `).get();

    res.json({
      avgRating: overall.avg_rating ? parseFloat(overall.avg_rating.toFixed(2)) : 0,
      totalResponses: overall.total_responses || 0,
      wastagePercent: wastage.wastage_percent ? parseFloat(wastage.wastage_percent.toFixed(1)) : 0,
      bestDish: bestDish || { dish_names: 'N/A', avg_rating: 0 },
      worstDish: worstDish || { dish_names: 'N/A', avg_rating: 0 }
    });
  } catch (err) {
    console.error('Error generating summary analytics:', err);
    res.status(500).json({ error: 'Server error generating summary.' });
  }
});

// GET /api/analytics/dish-ratings
app.get('/api/analytics/dish-ratings', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT m.dish_names, AVG(f.rating) AS avg_rating, COUNT(f.id) AS response_count
      FROM feedback f
      JOIN menu m ON f.menu_id = m.id
      GROUP BY m.dish_names
      ORDER BY avg_rating DESC
    `).all();

    // Clean decimals
    const formatted = list.map(item => ({
      ...item,
      avg_rating: parseFloat(item.avg_rating.toFixed(2))
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching dish-ratings analytics:', err);
    res.status(500).json({ error: 'Server error fetching dish-ratings.' });
  }
});

// GET /api/analytics/wastage-by-day
app.get('/api/analytics/wastage-by-day', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT 
        CASE strftime('%w', m.date)
          WHEN '0' THEN 'Sunday'
          WHEN '1' THEN 'Monday'
          WHEN '2' THEN 'Tuesday'
          WHEN '3' THEN 'Wednesday'
          WHEN '4' THEN 'Thursday'
          WHEN '5' THEN 'Friday'
          WHEN '6' THEN 'Saturday'
        END AS day_name,
        COUNT(CASE WHEN f.wastage_level = 'none' THEN 1 END) AS none,
        COUNT(CASE WHEN f.wastage_level = 'some' THEN 1 END) AS some,
        COUNT(CASE WHEN f.wastage_level = 'a_lot' THEN 1 END) AS a_lot,
        strftime('%w', m.date) as weekday_idx
      FROM feedback f
      JOIN menu m ON f.menu_id = m.id
      GROUP BY weekday_idx
      ORDER BY (strftime('%w', m.date) + 6) % 7
    `).all();

    res.json(list);
  } catch (err) {
    console.error('Error generating wastage-by-day analytics:', err);
    res.status(500).json({ error: 'Server error generating wastage by day.' });
  }
});

// GET /api/analytics/rating-trend
app.get('/api/analytics/rating-trend', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT m.date, AVG(f.rating) AS avg_rating
      FROM feedback f
      JOIN menu m ON f.menu_id = m.id
      GROUP BY m.date
      ORDER BY m.date ASC
    `).all();

    const formatted = list.map(item => ({
      ...item,
      avg_rating: parseFloat(item.avg_rating.toFixed(2))
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching rating trend:', err);
    res.status(500).json({ error: 'Server error fetching rating trend.' });
  }
});

// GET /api/analytics/attendance-correlation
app.get('/api/analytics/attendance-correlation', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT m.date, m.meal_type, m.dish_names, AVG(f.rating) AS avg_rating, COUNT(f.id) AS response_count
      FROM feedback f
      JOIN menu m ON f.menu_id = m.id
      GROUP BY m.id
      ORDER BY m.date ASC, m.meal_type ASC
    `).all();

    const formatted = list.map(item => ({
      ...item,
      avg_rating: parseFloat(item.avg_rating.toFixed(2))
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching attendance correlation:', err);
    res.status(500).json({ error: 'Server error fetching correlation.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Hostel Mess API server listening on port ${PORT}`);
});
