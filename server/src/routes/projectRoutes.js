import { Router } from 'express'
import multer from 'multer'

import { UPLOADS_DIR } from '../config/env.js'
import * as projects from '../controllers/projectController.js'

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({ storage })

export const projectRoutes = Router()

projectRoutes.get('/projects', projects.list)
projectRoutes.post('/upload', upload.single('file'), projects.upload)
projectRoutes.post('/translate/:projectId', projects.translate)
projectRoutes.get('/status/:projectId', projects.status)
projectRoutes.get('/download/:projectId', projects.download)
