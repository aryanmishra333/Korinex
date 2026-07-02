import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { randomUUID } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the repo root (if present).
dotenv.config({ path: path.join(__dirname, '..', '.env') })

import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { spawn } from 'child_process'
import fs from 'fs'

const app = express()
const PORT = process.env.PORT || 3001

const UPLOADS_DIR = path.join(__dirname, 'uploads')
const WORK_DIR = path.join(__dirname, 'work')
const DATA_DIR = path.join(__dirname, 'data')
const STORE_FILE = path.join(DATA_DIR, 'projects.json')

// The translation pipeline is a Python package run with the project's venv.
const PYTHON_DIR = path.join(__dirname, '..', 'python')
const VENV_PYTHON = path.join(PYTHON_DIR, '.venv', 'bin', 'python')

for (const dir of [UPLOADS_DIR, WORK_DIR, DATA_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// --- Temporary local project store (a flat JSON file) ------------------------
// This replaces Supabase/Postgres for now so the pipeline can be tested without
// any external service. It is single-user and not concurrency-safe; the real
// database + auth arrive in Phase 2.
function loadProjects() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveProjects(projects) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(projects, null, 2))
}

function getProject(id) {
  return loadProjects().find((project) => project.id === id) || null
}

function insertProject(project) {
  const projects = loadProjects()
  projects.push(project)
  saveProjects(projects)
  return project
}

function updateProject(id, patch) {
  const projects = loadProjects()
  const index = projects.findIndex((project) => project.id === id)
  if (index === -1) return null
  projects[index] = { ...projects[index], ...patch }
  saveProjects(projects)
  return projects[index]
}

// --- Middleware --------------------------------------------------------------
app.use(cors())
app.use(express.json())

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({ storage })

// --- Routes ------------------------------------------------------------------
app.get('/api/projects', (req, res) => {
  const projects = loadProjects().sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1
  )
  res.json(projects)
})

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    const { title } = req.body
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file uploaded' })

    const project = {
      id: randomUUID(),
      title: title || file.originalname,
      status: 'pending',
      created_at: new Date().toISOString(),
      pdf_url: path.resolve(file.path),
      translated_pdf_url: null,
    }
    insertProject(project)
    res.json({ projectId: project.id })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
})

app.post('/api/translate/:projectId', (req, res) => {
  const { projectId } = req.params
  const project = getProject(projectId)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  updateProject(projectId, { status: 'processing' })
  runPipeline(project)
  res.json({ success: true })
})

app.get('/api/status/:projectId', (req, res) => {
  const project = getProject(req.params.projectId)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  res.json(project)
})

app.get('/api/download/:projectId', (req, res) => {
  const project = getProject(req.params.projectId)
  if (!project || !project.translated_pdf_url) {
    return res.status(404).json({ error: 'Translated PDF not found' })
  }
  if (fs.existsSync(project.translated_pdf_url)) {
    res.download(project.translated_pdf_url, `${project.title}_translated.pdf`)
  } else {
    res.status(404).json({ error: 'File not found' })
  }
})

// --- Pipeline runner ---------------------------------------------------------
// Runs the Python pipeline as a subprocess in its own per-project work dir.
// Fire-and-forget for now; a real job queue replaces this in Phase 3.
function runPipeline(project) {
  const workDir = path.join(WORK_DIR, project.id)
  const args = [
    '-m',
    'pipeline.run',
    '--pdf',
    project.pdf_url,
    '--work-dir',
    workDir,
    '--project-id',
    project.id,
  ]

  console.log(`Starting pipeline for project ${project.id}...`)
  const proc = spawn(VENV_PYTHON, args, { cwd: PYTHON_DIR, stdio: 'inherit' })

  proc.on('close', (code) => {
    if (code === 0) {
      updateProject(project.id, {
        status: 'completed',
        translated_pdf_url: path.join(workDir, 'output.pdf'),
      })
      console.log(`Pipeline completed for project ${project.id}`)
    } else {
      updateProject(project.id, { status: 'failed' })
      console.error(`Pipeline for project ${project.id} exited with code ${code}`)
    }
  })

  proc.on('error', (error) => {
    updateProject(project.id, { status: 'failed' })
    console.error(`Pipeline failed to start for project ${project.id}:`, error)
  })
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
