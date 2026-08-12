import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

console.log(`Seeding database at: ${dbPath}`);
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// 1. Clear database tables
db.exec(`
  DELETE FROM feedback;
  DELETE FROM menu;
  DELETE FROM students;
`);

// 2. Insert 40 students
const studentNames = [
  'Aarav Sharma', 'Aditya Verma', 'Amit Patel', 'Ananya Iyer', 'Aniket Sen',
  'Anjali Gupta', 'Arjun Reddy', 'Ayush Mishra', 'Devendra Singh', 'Divya Nair',
  'Ishaan Rao', 'Karan Johar', 'Kavya Pillai', 'Manish Pandey', 'Meera Nair',
  'Neha Sharma', 'Nikhil Mehta', 'Nisha Patil', 'Pooja Hegde', 'Pranav Roy',
  'Priya Das', 'Rahul Verma', 'Rohan Kapoor', 'Riya Sen', 'Siddharth Rao',
  'Sneha Joshi', 'Tanvi Shah', 'Uday Kiran', 'Varun Dhawan', 'Vikram Seth',
  'Yash Chopra', 'Abhishek Bachan', 'Sanjay Dutt', 'Sunil Shetty', 'Salman Khan',
  'Shahrukh Khan', 'Aamir Khan', 'Hrithik Roshan', 'Ranbir Kapoor', 'Katrina Kaif'
];

const insertStudent = db.prepare(`
  INSERT INTO students (name, roll_no, room_no, pin)
  VALUES (?, ?, ?, ?)
`);

const students = [];
for (let i = 0; i < 40; i++) {
  const rollNo = `2026CS${String(i + 1).padStart(2, '0')}`;
  const roomNo = `${100 + Math.ceil((i + 1) / 2)}${i % 2 === 0 ? 'A' : 'B'}`;
  // Default PIN is 1234
  const result = insertStudent.run(studentNames[i], rollNo, roomNo, '1234');
  students.push({ id: result.lastInsertRowid, name: studentNames[i], rollNo });
}
console.log(`Seeded ${students.length} students.`);

// 3. Generate Menus for the past 21 days up to today (2026-07-21)
// Let's create a date range from 2026-06-30 to 2026-07-21 (22 days)
const dates = [];
let currentDate = new Date('2026-06-30');
const endDate = new Date('2026-07-21');

while (currentDate <= endDate) {
  dates.push(currentDate.toISOString().split('T')[0]);
  currentDate.setDate(currentDate.getDate() + 1);
}

// Menu items
const menusByDay = {
  // Sunday
  0: {
    breakfast: 'Bland Upma, Weak Tea',
    lunch: 'Watery Aloo Baingan, Hard Roti',
    dinner: 'Bland Khichdi, Curd'
  },
  // Monday
  1: {
    breakfast: 'Masala Dosa, Sambhar, Chutney',
    lunch: 'Paneer Butter Masala, Roti, Rice, Dal',
    dinner: 'Egg Curry, Steamed Rice, Roti'
  },
  // Tuesday
  2: {
    breakfast: 'Aloo Paratha, Curd, Pickle',
    lunch: 'Chicken Curry / Kadai Paneer, Rice, Roti, Salad',
    dinner: 'Dal Makhani, Jeera Rice, Butter Roti'
  },
  // Wednesday
  3: {
    breakfast: 'Idli Sambar, Coconut Chutney',
    lunch: 'Rajma Chawal, Roti, Boondi Raita',
    dinner: 'Palak Paneer, Phulka, Peas Pulav'
  },
  // Thursday
  4: {
    breakfast: 'Puri Sabji, Halwa',
    lunch: 'Chole Bhature, Veg Rice, Salad',
    dinner: 'Veg Korma, Jeera Rice, Paratha'
  },
  // Friday
  5: {
    breakfast: 'Bread Butter, Omelette / Veg Cutlet',
    lunch: 'Veg Biryani, Salan, Onion Raita',
    dinner: 'Butter Chicken / Paneer Pasanda, Butter Naan, Rice'
  },
  // Saturday
  6: {
    breakfast: 'Poha, Sev, Hot Tea',
    lunch: 'Kadhi Chawal, Aloo Bhujia, Roti',
    dinner: 'Chana Masala, Ghee Rice, Phulka'
  }
};

const insertMenu = db.prepare(`
  INSERT INTO menu (date, meal_type, dish_names)
  VALUES (?, ?, ?)
`);

const seededMenus = [];
for (const dateStr of dates) {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const menuConfig = menusByDay[dayOfWeek];

  for (const mealType of ['breakfast', 'lunch', 'dinner']) {
    const dishNames = menuConfig[mealType];
    const result = insertMenu.run(dateStr, mealType, dishNames);
    seededMenus.push({
      id: result.lastInsertRowid,
      date: dateStr,
      mealType,
      dishNames,
      dayOfWeek
    });
  }
}
console.log(`Seeded ${seededMenus.length} menu slots.`);

// 4. Seed Feedback
const insertFeedback = db.prepare(`
  INSERT INTO feedback (student_id, menu_id, rating, wastage_level, comment, submitted_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Comments based on ratings
const commentsByRating = {
  1: [
    'Absolutely terrible, tasted raw.',
    'Very bad quality, could not eat it.',
    'Total waste of money. The food was cold and tasteless.',
    'Unhygienic prep! Found a hair in my plate.',
    'Awful. High wastage because nobody liked it.'
  ],
  2: [
    'Not good today, very oily.',
    'Needs much more salt, extremely bland.',
    'Disappointed. Roti was hard like rubber.',
    'Sub-par quality. Not worth it.',
    'Very poor execution.'
  ],
  3: [
    'It was okay, average taste.',
    'Decent, but could have been better.',
    'Edible. Standard hostel food.',
    'Not bad, but they should improve the gravy.',
    'Average quality today.'
  ],
  4: [
    'Really nice! Tastes good.',
    'Good food today, happy with it.',
    'Loved the paneer! Well cooked.',
    'Properly spiced. Satisfying meal.',
    'Quite good, keep this standard up.'
  ],
  5: [
    'Amazing meal! Best in weeks!',
    'Perfect level of spices, absolutely loved it.',
    'Top notch food! Roti was soft and hot.',
    'Extraordinary taste! Feasts like home.',
    'Loved it, 5 stars for the chef!'
  ]
};

let feedbackCount = 0;

for (const menu of seededMenus) {
  const isSunday = menu.dayOfWeek === 0;

  // Let's decide how many students rate this meal slot.
  // Sundays will have fewer respondents (say 10-18) because they skip mess.
  // Weekdays will have more respondents (say 20-35).
  // This creates a nice correlation for response count vs. rating!
  const minRespondents = isSunday ? 10 : 20;
  const maxRespondents = isSunday ? 18 : 35;
  const numRespondents = Math.floor(Math.random() * (maxRespondents - minRespondents + 1)) + minRespondents;

  // Shuffle students to pick a random subset
  const shuffledStudents = [...students].sort(() => 0.5 - Math.random());
  const selectedStudents = shuffledStudents.slice(0, numRespondents);

  for (const student of selectedStudents) {
    let rating;
    let wastageLevel;

    if (isSunday) {
      // Dip in ratings: mostly 1 or 2, rarely 3, almost never 4 or 5
      const rand = Math.random();
      if (rand < 0.45) rating = 1;
      else if (rand < 0.85) rating = 2;
      else if (rand < 0.95) rating = 3;
      else rating = 4;

      // Higher wastage
      const wRand = Math.random();
      if (wRand < 0.1) wastageLevel = 'none';
      else if (wRand < 0.4) wastageLevel = 'some';
      else wastageLevel = 'a_lot';

    } else {
      // Normal/good ratings: mostly 4 and 5, some 3, rare 2, very rare 1
      const rand = Math.random();
      if (rand < 0.03) rating = 1;
      else if (rand < 0.08) rating = 2;
      else if (rand < 0.25) rating = 3;
      else if (rand < 0.65) rating = 4;
      else rating = 5;

      // Lower wastage
      const wRand = Math.random();
      if (wRand < 0.7) wastageLevel = 'none';
      else if (wRand < 0.93) wastageLevel = 'some';
      else wastageLevel = 'a_lot';
    }

    // Get a comment (80% chance of leaving a comment if rating <= 2, 40% if rating >= 3)
    const commentChance = rating <= 2 ? 0.8 : 0.4;
    let comment = null;
    if (Math.random() < commentChance) {
      const commentPool = commentsByRating[rating];
      comment = commentPool[Math.floor(Math.random() * commentPool.length)];
    }

    // Submit timestamp is close to the meal time
    let mealHour;
    if (menu.mealType === 'breakfast') mealHour = '09:00:00';
    else if (menu.mealType === 'lunch') mealHour = '13:30:00';
    else mealHour = '20:30:00';

    const submittedAt = `${menu.date} ${mealHour}`;

    insertFeedback.run(student.id, menu.id, rating, wastageLevel, comment, submittedAt);
    feedbackCount++;
  }
}

console.log(`Seeded ${feedbackCount} feedback submissions.`);
db.close();
console.log('Database seeding finished successfully.');
