import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env (DATABASE_URL, future OAuth secrets) BEFORE importing modules that
// read process.env at import time (Prisma reads DATABASE_URL on instantiation).
dotenv.config({ path: path.join(__dirname, '.env') })

const { createApp } = await import('./src/app.js')
const { prisma } = await import('./src/db/client.js')
const { PORT, UPLOADS_DIR, WORK_DIR, LOCAL_USER_ID, LOCAL_USER_EMAIL } = await import(
  './src/config/env.js'
)

for (const dir of [UPLOADS_DIR, WORK_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// Interim: ensure the local stub user exists so projects can attach to it until
// OAuth (Phase 2c) provides real users.
await prisma.user.upsert({
  where: { id: LOCAL_USER_ID },
  update: {},
  create: { id: LOCAL_USER_ID, email: LOCAL_USER_EMAIL, name: 'Local User' },
})

const app = createApp()
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
