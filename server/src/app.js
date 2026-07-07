import cors from 'cors'
import express from 'express'

import { errorHandler } from './middleware/error.js'
import { projectRoutes } from './routes/projectRoutes.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (req, res) => res.json({ ok: true }))
  app.use('/api', projectRoutes)

  app.use(errorHandler)
  return app
}
