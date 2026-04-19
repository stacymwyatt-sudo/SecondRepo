// server.js — the backend
// This file runs a web server and handles all API requests.
// Data is stored in a SQLite database file (contacts.db).

const express  = require('express');
const Database = require('better-sqlite3');
const path     = require('path');

const app  = express();
const PORT = 3000;

// ── Database setup ──────────────────────────────────────────────
// Opens (or creates) contacts.db in this folder.
// Tests can swap this out by setting app.locals.db before running.
const db = new Database(path.join(__dirname, 'contacts.db'));

// Create the contacts table if it doesn't exist yet.
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT    NOT NULL,
    email    TEXT    NOT NULL DEFAULT '',
    phone    TEXT    NOT NULL DEFAULT '',
    birthday TEXT    NOT NULL DEFAULT ''
  )
`);

// Migration: add birthday column to pre-existing databases that don't have it.
const existingCols = db.prepare("PRAGMA table_info(contacts)").all();
if (!existingCols.find(c => c.name === 'birthday')) {
  db.exec("ALTER TABLE contacts ADD COLUMN birthday TEXT NOT NULL DEFAULT ''");
}

// Helper: returns the active database (real or test).
function getDb() {
  return app.locals.db || db;
}

// Helper: strips all non-digit characters from a phone number and reformats
// as (XXX) XXX-XXXX. Returns null if the result isn't exactly 10 digits.
function formatPhone(raw) {
  const digits = String(raw).replace(/\D/g, ''); // keep only 0-9
  if (digits.length !== 10) return null;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

// Helper: validates a birthday string in mm/dd format.
// Returns true for valid mm/dd, false otherwise. Empty string is valid (optional field).
function isValidBirthday(raw) {
  if (raw === '' || raw === undefined || raw === null) return true;
  const match = /^(\d{2})\/(\d{2})$/.exec(String(raw));
  if (!match) return false;
  const month = Number(match[1]);
  const day   = Number(match[2]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Reject obviously impossible day counts per month (allow Feb 29 since year is unknown).
  const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= maxDays[month - 1];
}

// ── Middleware ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── API Routes ──────────────────────────────────────────────────

// GET /contacts — return all contacts
app.get('/contacts', (req, res) => {
  const contacts = getDb().prepare('SELECT * FROM contacts ORDER BY name').all();
  res.json(contacts);
});

// POST /contacts — add a new contact
app.post('/contacts', (req, res) => {
  const { name, email, phone, birthday } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!phone) {
    return res.status(400).json({ error: 'Phone is required' });
  }
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    return res.status(400).json({ error: 'Phone must be a 10-digit US number' });
  }
  if (!isValidBirthday(birthday)) {
    return res.status(400).json({ error: 'Birthday must be in mm/dd format' });
  }
  const birthdayValue = birthday || '';
  const result = getDb().prepare(
    'INSERT INTO contacts (name, email, phone, birthday) VALUES (?, ?, ?, ?)'
  ).run(name, email, formattedPhone, birthdayValue);
  res.status(201).json({ id: result.lastInsertRowid, name, email, phone: formattedPhone, birthday: birthdayValue });
});

// PUT /contacts/:id — update an existing contact
app.put('/contacts/:id', (req, res) => {
  const { name, email, phone, birthday } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!phone) {
    return res.status(400).json({ error: 'Phone is required' });
  }
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    return res.status(400).json({ error: 'Phone must be a 10-digit US number' });
  }
  if (!isValidBirthday(birthday)) {
    return res.status(400).json({ error: 'Birthday must be in mm/dd format' });
  }
  const birthdayValue = birthday || '';
  getDb().prepare(
    'UPDATE contacts SET name = ?, email = ?, phone = ?, birthday = ? WHERE id = ?'
  ).run(name, email, formattedPhone, birthdayValue, req.params.id);
  res.json({ id: Number(req.params.id), name, email, phone: formattedPhone, birthday: birthdayValue });
});

// DELETE /contacts/:id — delete a contact
app.delete('/contacts/:id', (req, res) => {
  getDb().prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Start server ────────────────────────────────────────────────
// Only start listening if this file is run directly (node server.js).
// When imported by tests, we skip this so tests can control the server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Export the app so tests can import it.
module.exports = app;
