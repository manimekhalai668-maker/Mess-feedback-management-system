# MessSync - Hostel Mess Menu & Feedback System

A premium, full-stack digital platform designed for hostel students to rate daily meals, report food wastage, and view menus. It also provides mess committees/admins with a comprehensive analytics dashboard displaying food satisfaction rates, wastage levels, and rating trends.

---

## Technical Stack
- **Frontend**: React (Vite) + Recharts (for analytics visualizations) + polished Vanilla CSS (with modern dark-slate-blue layout & glassmorphism components)
- **Backend**: Node.js + Express (REST API)
- **Database**: SQLite (via Node's native built-in `node:sqlite` module for zero native compilation dependencies)

---

## Getting Started

### Prerequisites
- Node.js version **22.5.0** or later (required for the built-in `node:sqlite` module).

### Installation & Run Instructions

#### 1. Setup Backend
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize and seed the SQLite database:
   ```bash
   npm run db:reset
   ```
   *This command runs `db/init.js` to create tables and `db/seed.js` to populate 40 students and 3 weeks of realistic, pattern-rich daily menus and rating feedbacks (including lower Sunday scores & high-wastage mappings).*
4. Start the Express server:
   ```bash
   npm start
   ```
   *The server will run on [http://localhost:5000](http://localhost:5000).*

#### 2. Setup Frontend
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The client application will run on [http://localhost:5173](http://localhost:5173).*

---

## Demo Credentials
- **Student View**:
  - **Roll Number**: `2026CS01` (up to `2026CS40`)
  - **PIN Code**: `1234` (default for all seeded students)
- **Admin View**:
  - Accessible directly via the **Admin Dashboard** navigation tab.

---

## Importing Your Real Student Database

You can easily import your actual hostel student list using a CSV file:

1. Create a file named **`students.csv`** in the **`backend/db/`** directory.
2. Structure your CSV with a header row followed by comma-separated student details:
   ```csv
   name,roll_no,room_no,pin
   Rahul Sharma,2026CS41,102A,1234
   Priya Patel,2026CS42,105B,5678
   Amit Kumar,2026EE12,204A,1122
   ```
   *Note: If the `pin` column is omitted or empty, it will default to `"1234"`.*
3. Run the import script from the `backend` folder:
   ```bash
   npm run db:import
   ```
   This script will load the student records into the database. If a student with the same `roll_no` already exists, it will update their name, room number, and PIN.

---

## Database Schema & Analytics Queries

### Database Schema
```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  roll_no TEXT UNIQUE NOT NULL,
  room_no TEXT,
  pin TEXT NOT NULL DEFAULT '1234'
);

CREATE TABLE menu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,               -- YYYY-MM-DD
  meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner')),
  dish_names TEXT NOT NULL,
  UNIQUE(date, meal_type)
);

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  menu_id INTEGER NOT NULL REFERENCES menu(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  wastage_level TEXT NOT NULL CHECK(wastage_level IN ('none','some','a_lot')),
  comment TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, menu_id)       -- one rating per student per meal slot
);
```

### Raw SQL Analytical Queries

#### 1. KPI Metrics Summary
- **Average Rating & Total Submissions**:
  ```sql
  SELECT COUNT(*) as total_responses, AVG(rating) as avg_rating FROM feedback;
  ```
- **Wastage Percentage**:
  ```sql
  SELECT (COUNT(CASE WHEN wastage_level IN ('some', 'a_lot') THEN 1 END) * 100.0 / COUNT(*)) AS wastage_percent FROM feedback;
  ```
- **Best Rated Dish**:
  ```sql
  SELECT m.dish_names, AVG(f.rating) as avg_rating
  FROM feedback f JOIN menu m ON f.menu_id = m.id
  GROUP BY m.dish_names ORDER BY avg_rating DESC LIMIT 1;
  ```
- **Worst Rated Dish**:
  ```sql
  SELECT m.dish_names, AVG(f.rating) as avg_rating
  FROM feedback f JOIN menu m ON f.menu_id = m.id
  GROUP BY m.dish_names ORDER BY avg_rating ASC LIMIT 1;
  ```

#### 2. Ranked Dish Ratings
```sql
SELECT m.dish_names, AVG(f.rating) AS avg_rating, COUNT(f.id) AS response_count
FROM feedback f
JOIN menu m ON f.menu_id = m.id
GROUP BY m.dish_names
ORDER BY avg_rating DESC;
```

#### 3. Wastage level counts grouped by weekday
```sql
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
  COUNT(CASE WHEN f.wastage_level = 'a_lot' THEN 1 END) AS a_lot
FROM feedback f
JOIN menu m ON f.menu_id = m.id
GROUP BY strftime('%w', m.date)
ORDER BY (strftime('%w', m.date) + 6) % 7;
```

#### 4. Rating Trend Over Time
```sql
SELECT m.date, AVG(f.rating) AS avg_rating
FROM feedback f
JOIN menu m ON f.menu_id = m.id
GROUP BY m.date
ORDER BY m.date ASC;
```

#### 5. Rating vs Response Count Correlation
```sql
SELECT m.date, m.meal_type, m.dish_names, AVG(f.rating) AS avg_rating, COUNT(f.id) AS response_count
FROM feedback f
JOIN menu m ON f.menu_id = m.id
GROUP BY m.id
ORDER BY m.date ASC, m.meal_type ASC;
```
