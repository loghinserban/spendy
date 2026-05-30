import { expect, test } from '@playwright/test'

test.describe('Spendy Silver Challenge', () => {
  test('Scenario 1: successfully add a new expense and see it in the table', async ({ page }) => {
    const title = `Playwright Add ${Date.now()}`

    await page.goto('/dashboard')

    await page.getByRole('link', { name: 'Add Expense' }).click()
    await expect(page).toHaveURL(/\/expenses\/new/)

    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Amount').fill('25.75')
    await page.getByLabel('Date').fill('2026-04-02')
    await page.getByLabel('Category').selectOption('Shopping')
    await page.getByLabel('Payment Method').selectOption('Debit Card')
    await page.getByRole('button', { name: 'Add Expense' }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    const row = page
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: title, exact: true }) })
    await expect(row).toHaveCount(1)
  })

  test('Scenario 2: trigger UI validation errors', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('link', { name: 'Add Expense' }).click()
    await expect(page).toHaveURL(/\/expenses\/new/)

    await page.getByRole('button', { name: 'Add Expense' }).click()

    await expect(page.getByText('Title is required.')).toBeVisible()
    await expect(page.getByText('Amount must be greater than 0.')).toBeVisible()
    await expect(page.getByText('Date is required.')).toBeVisible()
  })

  test('Scenario 3: delete an item from the dashboard', async ({ page }) => {
    const title = `Playwright Delete ${Date.now()}`

    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Add Expense' }).click()

    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Amount').fill('48.99')
    await page.getByLabel('Date').fill('2026-04-02')
    await page.getByLabel('Category').selectOption('Shopping')
    await page.getByLabel('Payment Method').selectOption('Debit Card')
    await page.getByLabel('Notes (optional)').fill('Created from Playwright scenario C')

    await page.getByRole('button', { name: 'Add Expense' }).click()

    await expect(page).toHaveURL(/\/dashboard/)

    const row = page
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: title, exact: true }) })

    await expect(row).toHaveCount(1)

    await row.getByRole('button', { name: `Delete ${title}` }).click()
    await expect(row).toHaveCount(0)
  })
})
