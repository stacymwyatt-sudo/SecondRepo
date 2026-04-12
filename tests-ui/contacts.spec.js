// tests-ui/contacts.spec.js
// UI tests for the contact list app.
// These tests open a real browser and interact with the page like a user would.
//
// IMPORTANT: The server must be running before you run these tests.
//   In one terminal:  node server.js
//   In another:       npx playwright test

const { test, expect } = require('@playwright/test');

// ── Before each test ────────────────────────────────────────────────────────
// Wipe all contacts so each test starts with a clean slate.
// We call the API directly here — it's faster than doing it through the UI.
test.beforeEach(async ({ request }) => {
  const contacts = await request.get('http://localhost:3000/contacts');
  const list = await contacts.json();
  for (const contact of list) {
    await request.delete(`http://localhost:3000/contacts/${contact.id}`);
  }
});

// ── Test 1: Page loads correctly ────────────────────────────────────────────
test('shows the page title and empty state message', async ({ page }) => {
  await page.goto('/');

  // Find the heading by its role (heading) and visible text
  await expect(page.getByRole('heading', { name: 'Contact List' })).toBeVisible();

  // Find the empty state message by its visible text
  await expect(page.getByText('No contacts yet. Add one above!')).toBeVisible();
});

// ── Test 2: Add a contact ────────────────────────────────────────────────────
test('user can add a new contact and see it in the list', async ({ page }) => {
  await page.goto('/');

  // Find each field by the placeholder text the user sees
  await page.getByPlaceholder('Name (required)').fill('Ada Lovelace');
  await page.getByPlaceholder('Email').fill('ada@example.com');
  await page.getByPlaceholder('Phone (required)').fill('8325551234');

  // Find the button by its visible label
  await page.getByRole('button', { name: 'Add Contact' }).click();

  // Verify the contact card appears with the right content
  await expect(page.locator('.contact-card')).toBeVisible();
  await expect(page.locator('.contact-card')).toContainText('Ada Lovelace');
  await expect(page.locator('.contact-card')).toContainText('ada@example.com');
});

// ── Test 3: Delete a contact ─────────────────────────────────────────────────
test('user can delete a contact', async ({ page }) => {
  await page.goto('/');

  // Add a contact first so we have something to delete
  await page.getByPlaceholder('Name (required)').fill('To Be Deleted');
  await page.getByPlaceholder('Email (required)').fill('delete@example.com');
  await page.getByPlaceholder('Phone (required)').fill('8325550001');
  await page.getByRole('button', { name: 'Add Contact' }).click();
  await expect(page.locator('.contact-card')).toBeVisible();

  // Click delete — Playwright auto-accepts the confirm() dialog
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();

  // The card should be gone and the empty message should return
  await expect(page.locator('.contact-card')).toHaveCount(0);
  await expect(page.getByText('No contacts yet. Add one above!')).toBeVisible();
});

// ── Test 4: Edit a contact ───────────────────────────────────────────────────
test('user can edit a contact', async ({ page }) => {
  await page.goto('/');

  // Add a contact to edit
  await page.getByPlaceholder('Name (required)').fill('Original Name');
  await page.getByPlaceholder('Email (required)').fill('original@example.com');
  await page.getByPlaceholder('Phone (required)').fill('8325550002');
  await page.getByRole('button', { name: 'Add Contact' }).click();
  await expect(page.locator('.contact-card')).toBeVisible();

  // Click Edit — this populates the form and changes the button label to 'Save Changes'
  await page.getByRole('button', { name: 'Edit' }).click();

  // Clear the name field and type a new name
  await page.getByPlaceholder('Name (required)').fill('Updated Name');

  // The submit button now says 'Save Changes'
  await page.getByRole('button', { name: 'Save Changes' }).click();

  // The card should now show the updated name
  await expect(page.locator('.contact-card')).toContainText('Updated Name');
  await expect(page.locator('.contact-card')).not.toContainText('Original Name');
});

// ── Test 5: Search filters contacts ─────────────────────────────────────────
test('search box filters the contact list', async ({ page }) => {
  await page.goto('/');

  // Add two contacts
  await page.getByPlaceholder('Name (required)').fill('Alice Smith');
  await page.getByPlaceholder('Email (required)').fill('alice@example.com');
  await page.getByPlaceholder('Phone (required)').fill('8325550003');
  await page.getByRole('button', { name: 'Add Contact' }).click();
  await page.getByPlaceholder('Name (required)').fill('Bob Jones');
  await page.getByPlaceholder('Email (required)').fill('bob@example.com');
  await page.getByPlaceholder('Phone (required)').fill('8325550004');
  await page.getByRole('button', { name: 'Add Contact' }).click();

  // Wait for both cards to appear
  await expect(page.locator('.contact-card')).toHaveCount(2);

  // Type in the search box — found by its placeholder text
  await page.getByPlaceholder('Search contacts...').fill('Alice');

  // Only Alice's card should be visible
  const cards = page.locator('.contact-card');
  await expect(cards.filter({ hasText: 'Alice Smith' })).toBeVisible();
  await expect(cards.filter({ hasText: 'Bob Jones' })).not.toBeVisible();
});
