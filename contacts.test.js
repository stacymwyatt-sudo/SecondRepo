// contacts.test.js
// Automated tests for the contacts API.
// Run with: npm test
//
// These tests use an in-memory database — they never touch contacts.db,
// so your real data is always safe.

const request  = require('supertest');
const Database = require('better-sqlite3');
const app      = require('./server');

// ── Test database setup ─────────────────────────────────────────
// Override the database with a temporary in-memory one before tests run.
// ':memory:' is a special SQLite keyword — the database exists only in RAM
// and is wiped automatically when tests finish.
let db;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL,
      email TEXT    NOT NULL DEFAULT '',
      phone TEXT    NOT NULL DEFAULT ''
    )
  `);
  // Replace the app's real database with the test one.
  app.locals.db = db;
});

// Wipe the table between each test so tests don't affect each other.
beforeEach(() => {
  db.prepare('DELETE FROM contacts').run();
});

// ── Helper ──────────────────────────────────────────────────────
// Adds a contact and returns it. Used to set up tests that need existing data.
async function createContact(data = {}) {
  const contact = { name: 'Test User', email: 'test@test.com', phone: '555-0000', ...data };
  const res = await request(app).post('/contacts').send(contact);
  return res.body;
}

// ── GET /contacts ───────────────────────────────────────────────
describe('GET /contacts', () => {

  test('returns an empty array when there are no contacts', async () => {
    const res = await request(app).get('/contacts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all contacts', async () => {
    await createContact({ name: 'Alice' });
    await createContact({ name: 'Bob' });
    const res = await request(app).get('/contacts');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('returns contacts sorted alphabetically by name', async () => {
    await createContact({ name: 'Zara' });
    await createContact({ name: 'Alice' });
    const res = await request(app).get('/contacts');
    expect(res.body[0].name).toBe('Alice');
    expect(res.body[1].name).toBe('Zara');
  });

});

// ── POST /contacts ──────────────────────────────────────────────
describe('POST /contacts', () => {

  test('creates a new contact and returns it', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Jane Smith', email: 'jane@test.com', phone: '555-1234' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Jane Smith');
    expect(res.body.email).toBe('jane@test.com');
    expect(res.body.phone).toBe('555-1234');
    expect(res.body.id).toBeDefined(); // an id was assigned
  });

  test('returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ email: 'no-name@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name is required');
  });

  test('creates a contact with only a name (email and phone are optional)', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Name Only' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Name Only');
  });

});

// ── PUT /contacts/:id ───────────────────────────────────────────
describe('PUT /contacts/:id', () => {

  test('updates an existing contact', async () => {
    const created = await createContact({ name: 'Old Name', email: 'old@test.com' });
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ name: 'New Name', email: 'new@test.com', phone: '555-9999' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.email).toBe('new@test.com');
  });

  test('returns 400 if name is missing on update', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ email: 'no-name@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name is required');
  });

});

// ── DELETE /contacts/:id ────────────────────────────────────────
describe('DELETE /contacts/:id', () => {

  test('deletes a contact and returns success', async () => {
    const created = await createContact();
    const res = await request(app).delete(`/contacts/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('contact is no longer returned after deletion', async () => {
    const created = await createContact();
    await request(app).delete(`/contacts/${created.id}`);
    const res = await request(app).get('/contacts');
    expect(res.body.length).toBe(0);
  });

});
