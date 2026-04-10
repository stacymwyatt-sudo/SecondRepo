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
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL,
    email TEXT    NOT NULL DEFAULT '',
    phone TEXT    NOT NULL DEFAULT ''
  )
`);

// Helper: returns the active database (real or test).
function getDb() {
  return app.locals.db || db;
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
  const { name, email, phone } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const result = getDb().prepare(
    'INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)'
  ).run(name, email || '', phone || '');
  res.json({ id: result.lastInsertRowid, name, email: email || '', phone: phone || '' });
});

// PUT /contacts/:id — update an existing contact
app.put('/contacts/:id', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  getDb().prepare(
    'UPDATE contacts SET name = ?, email = ?, phone = ? WHERE id = ?'
  ).run(name, email || '', phone || '', req.params.id);
  res.json({ id: Number(req.params.id), name, email: email || '', phone: phone || '' });
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
