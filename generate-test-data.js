// generate-test-data.js
// Run this script to fill your database with random test contacts.
// Contacts are created through the API so all validation and formatting rules apply.
//
// Usage:
//   node generate-test-data.js        ← adds 10 contacts
//   node generate-test-data.js 25     ← adds 25 contacts
//   node generate-test-data.js 10 --clear  ← wipes existing data first, then adds 10
//
// IMPORTANT: The server must be running before you run this script.
//   node server.js

// ── Name parts to mix and match ─────────────────────────────────
const firstNames = [
  'Alice', 'Brian', 'Carmen', 'Derek', 'Elena',
  'Frank', 'Grace', 'Henry', 'Isabel', 'James',
  'Karen', 'Liam',  'Maria', 'Nathan', 'Olivia',
  'Pablo', 'Quinn', 'Rachel','Samuel','Tanya',
  'Ulric', 'Vera',  'Wayne', 'Xena',  'Yolanda', 'Zach'
];

const lastNames = [
  'Anderson', 'Baker',   'Carter',  'Davis',   'Evans',
  'Foster',   'Garcia',  'Harris',  'Ingram',  'Johnson',
  'King',     'Lopez',   'Miller',  'Nelson',  'Owens',
  'Patel',    'Quinn',   'Rivera',  'Smith',   'Taylor',
  'Upton',    'Vargas',  'Walker',  'Xavier',  'Young',   'Zhang'
];

const emailDomains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com'
];

const areaCodes = [
  '512', '713', '214', '832', '469',
  '281', '346', '737', '915', '210'
];

// ── Helper functions ────────────────────────────────────────────

// Pick a random item from an array.
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a random 10-digit phone number as plain digits.
// The API will format it as (XXX) XXX-XXXX.
function randomPhone() {
  const area  = pick(areaCodes);
  const local = String(Math.floor(1000000 + Math.random() * 9000000));
  return `${area}${local}`;
}

// Build one random contact object.
function generateContact() {
  const first  = pick(firstNames);
  const last   = pick(lastNames);
  const domain = pick(emailDomains);

  return {
    name:  `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    phone: randomPhone()
  };
}

// ── Main ────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const count = parseInt(args[0]) || 10;
const clear = args.includes('--clear');

const BASE_URL = 'http://localhost:3000';

async function run() {
  // Clear existing contacts if --clear flag was passed
  if (clear) {
    const existing = await fetch(`${BASE_URL}/contacts`).then(r => r.json());
    for (const c of existing) {
      await fetch(`${BASE_URL}/contacts/${c.id}`, { method: 'DELETE' });
    }
    console.log('Cleared existing contacts.');
  }

  // Create contacts one by one through the API
  let successCount = 0;
  for (const contact of Array.from({ length: count }, generateContact)) {
    const res = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact)
    });

    if (res.ok) {
      successCount++;
    } else {
      const err = await res.json();
      console.error(`Failed to create contact: ${JSON.stringify(err)}`);
    }
  }

  console.log(`Added ${successCount} random contacts via the API`);
}

run();
