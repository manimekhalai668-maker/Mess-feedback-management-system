import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

console.log(`Updating database at: ${dbPath}`);
const db = new DatabaseSync(dbPath);

try {
  const result = db.exec("UPDATE students SET pin = 'Esec@123'");
  console.log("Successfully updated all student PINs to 'Esec@123'.");
} catch (err) {
  console.error("Error updating PINs:", err.message);
} finally {
  db.close();
}
