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
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL,
      email    TEXT    NOT NULL DEFAULT '',
      phone    TEXT    NOT NULL DEFAULT '',
      birthday TEXT    NOT NULL DEFAULT ''
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
  const contact = { name: 'Test User', email: 'test@test.com', phone: '8325550000', ...data };
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

  test('creates a new contact and returns it with formatted phone', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Jane Smith', email: 'jane@test.com', phone: '8325551234' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Jane Smith');
    expect(res.body.email).toBe('jane@test.com');
    expect(res.body.phone).toBe('(832) 555-1234');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 if name is missing', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ email: 'no-name@test.com', phone: '8325550000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name is required');
  });

  test('returns 400 if email is missing', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'No Email', phone: '8325550000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email is required');
  });

  test('returns 400 if phone is missing', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'No Phone', email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Phone is required');
  });

  test('returns 400 if phone is not 10 digits', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Bad Phone', email: 'test@test.com', phone: '555' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Phone must be a 10-digit US number');
  });

  test('returns 400 if phone contains non-numeric characters', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Bad Phone', email: 'test@test.com', phone: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Phone must be a 10-digit US number');
  });

  test('accepts phone with dashes and formats it correctly', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Matt', email: 'matt@test.com', phone: '832-555-1234' });
    expect(res.status).toBe(201);
    expect(res.body.phone).toBe('(832) 555-1234');
  });

  test('accepts phone with parentheses and spaces and formats it correctly', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Melody', email: 'melody@test.com', phone: '(832) 555-1234' });
    expect(res.status).toBe(201);
    expect(res.body.phone).toBe('(832) 555-1234');
  });

  // ── Birthday field (optional, mm/dd format) ──
  test('accepts a valid birthday in mm/dd format', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Bday User', email: 'b@test.com', phone: '8325550000', birthday: '04/18' });
    expect(res.status).toBe(201);
    expect(res.body.birthday).toBe('04/18');
  });

  test('accepts a contact with no birthday (optional field)', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'No Bday', email: 'nb@test.com', phone: '8325550000' });
    expect(res.status).toBe(201);
    expect(res.body.birthday).toBe('');
  });

  test('accepts an empty-string birthday', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Empty Bday', email: 'e@test.com', phone: '8325550000', birthday: '' });
    expect(res.status).toBe(201);
    expect(res.body.birthday).toBe('');
  });

  test('returns 400 if birthday is missing the slash', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Bad Bday', email: 'b@test.com', phone: '8325550000', birthday: '0418' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Birthday must be in mm/dd format');
  });

  test('returns 400 if birthday has an invalid month', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Bad Bday', email: 'b@test.com', phone: '8325550000', birthday: '13/01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Birthday must be in mm/dd format');
  });

  test('returns 400 if birthday has an impossible day for the month', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Bad Bday', email: 'b@test.com', phone: '8325550000', birthday: '02/30' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Birthday must be in mm/dd format');
  });

  test('returns 400 if birthday uses single-digit month', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Bad Bday', email: 'b@test.com', phone: '8325550000', birthday: '4/18' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Birthday must be in mm/dd format');
  });

  test('accepts Feb 29 since year is unknown', async () => {
    const res = await request(app)
      .post('/contacts')
      .send({ name: 'Leap', email: 'l@test.com', phone: '8325550000', birthday: '02/29' });
    expect(res.status).toBe(201);
    expect(res.body.birthday).toBe('02/29');
  });

});

// ── PUT /contacts/:id ───────────────────────────────────────────
describe('PUT /contacts/:id', () => {

  test('updates an existing contact', async () => {
    const created = await createContact({ name: 'Old Name', email: 'old@test.com' });
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ name: 'New Name', email: 'new@test.com', phone: '8325559999' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.email).toBe('new@test.com');
    expect(res.body.phone).toBe('(832) 555-9999');
  });

  test('returns 400 if name is missing on update', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ email: 'no-name@test.com', phone: '8325550000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name is required');
  });

  test('returns 400 if email is missing on update', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ name: 'Test', phone: '8325550000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email is required');
  });

  test('returns 400 if phone is invalid on update', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ name: 'Test', email: 'test@test.com', phone: '555' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Phone must be a 10-digit US number');
  });

  test('can update a contact to add a birthday', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ name: 'Test', email: 'test@test.com', phone: '8325550000', birthday: '12/25' });
    expect(res.status).toBe(200);
    expect(res.body.birthday).toBe('12/25');
  });

  test('can clear a birthday by sending an empty string', async () => {
    const created = await createContact({ birthday: '01/15' });
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ name: 'Test', email: 'test@test.com', phone: '8325550000', birthday: '' });
    expect(res.status).toBe(200);
    expect(res.body.birthday).toBe('');
  });

  test('returns 400 if birthday format is invalid on update', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/contacts/${created.id}`)
      .send({ name: 'Test', email: 'test@test.com', phone: '8325550000', birthday: '13/45' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Birthday must be in mm/dd format');
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
