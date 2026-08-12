import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

console.log(`Initializing database at: ${dbPath}`);
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    roll_no TEXT UNIQUE NOT NULL,
    room_no TEXT,
    pin TEXT NOT NULL DEFAULT '1234'
  );

  CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,               -- YYYY-MM-DD
    meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner')),
    dish_names TEXT NOT NULL,
    UNIQUE(date, meal_type)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    menu_id INTEGER NOT NULL REFERENCES menu(id),
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    wastage_level TEXT NOT NULL CHECK(wastage_level IN ('none','some','a_lot')),
    comment TEXT,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, menu_id)       -- one rating per student per meal slot
  );
`);

console.log('Database initialized successfully.');
db.close();
