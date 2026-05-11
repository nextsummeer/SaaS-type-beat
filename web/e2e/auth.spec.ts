import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const testEmail = `e2e-${Date.now()}@beatpost.test`
const testPassword = 'Beatpost@2026test'

test.describe('Autenticacao', () => {
  let userId: string

  test.beforeAll(async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias no .env.local'
      )
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    })
    if (error) throw new Error(`Erro ao criar usuario de teste: ${error.message}`)
    userId = data.user.id
  })

  test.afterAll(async () => {
    if (!userId) return
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await admin.auth.admin.deleteUser(userId)
  })

  test('login → dashboard → logout', async ({ page }) => {
    await page.goto('/login')

    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await page.getByRole('link', { name: 'Sair' }).click()

    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })
})
