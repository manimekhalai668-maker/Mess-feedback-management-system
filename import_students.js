import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');
const csvPath = path.resolve(__dirname, 'students.csv');

// Check if CSV exists
if (!fs.existsSync(csvPath)) {
  console.log(`\x1b[31mError: CSV file not found at: ${csvPath}\x1b[0m`);
  console.log('\nTo import your real student database, follow these steps:');
  console.log('1. Create a file named \x1b[36mstudents.csv\x1b[0m inside the \x1b[35mbackend/db/\x1b[0m directory.');
  console.log('2. Populate it with your student list in the following format (comma-separated):');
  console.log('\n   name,roll_no,room_no,pin');
  console.log('   Rahul Sharma,2026CS41,102A,1234');
  console.log('   Priya Patel,2026CS42,105B,5678');
  console.log('   Amit Kumar,2026EE12,204A,1122');
  console.log('\n3. Run this script again to import them.');
  process.exit(1);
}

console.log(`Reading student data from: ${csvPath}`);
const data = fs.readFileSync(csvPath, 'utf8');
const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');

if (lines.length <= 1) {
  console.log('\x1b[31mError: The CSV file is empty or only contains the header line.\x1b[0m');
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

const insertStmt = db.prepare(`
  INSERT INTO students (name, roll_no, room_no, pin)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(roll_no) DO UPDATE SET
    name = excluded.name,
    room_no = excluded.room_no,
    pin = excluded.pin
`);

let count = 0;
// Skip header line
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  
  // Basic CSV column split
  const columns = line.split(',');
  if (columns.length < 3) {
    console.log(`\x1b[33mWarning: Skipping line ${i + 1} (invalid format): ${line}\x1b[0m`);
    continue;
  }

  const name = columns[0].trim();
  const roll_no = columns[1].trim();
  const room_no = columns[2].trim();
  const pin = columns[3] ? columns[3].trim() : 'Esec@123'; // Default PIN to Esec@123 if not specified

  if (!name || !roll_no) {
    console.log(`\x1b[33mWarning: Skipping line ${i + 1} (missing Name or Roll No)\x1b[0m`);
    continue;
  }

  try {
    insertStmt.run(name, roll_no, room_no, pin);
    count++;
  } catch (err) {
    console.log(`\x1b[31mError inserting student on line ${i + 1}: ${err.message}\x1b[0m`);
  }
}

console.log(`\n\x1b[32mSuccess: Successfully imported/updated ${count} students in the database.\x1b[0m`);
db.close();
