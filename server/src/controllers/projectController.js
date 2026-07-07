import fs from 'fs'
import path from 'path'

import { LOCAL_USER_ID } from '../config/env.js'
import {
  createProject,
  getProject,
  listProjects,
  toApiProject,
  updateProject,
} from '../services/projectService.js'
import { runPipeline } from '../services/pipelineService.js'

// Interim: everything runs as the single local user until OAuth (Phase 2c),
// where this becomes req.user.id from the authenticated session.
function currentUserId(req) {
  return req.user?.id || LOCAL_USER_ID
}

export async function list(req, res, next) {
  try {
    res.json(await listProjects(currentUserId(req)))
  } catch (error) {
    next(error)
  }
}

export async function upload(req, res, next) {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file uploaded' })
    const project = await createProject({
      userId: currentUserId(req),
      title: req.body.title || file.originalname,
      pdfPath: path.resolve(file.path),
    })
    res.json({ projectId: project.id })
  } catch (error) {
    next(error)
  }
}

export async function translate(req, res, next) {
  try {
    const project = await getProject(req.params.projectId)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    await updateProject(project.id, { status: 'processing' })
    runPipeline(project)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export async function status(req, res, next) {
  try {
    const project = await getProject(req.params.projectId)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json(toApiProject(project))
  } catch (error) {
    next(error)
  }
}

export async function download(req, res, next) {
  try {
    const project = await getProject(req.params.projectId)
    if (!project || !project.translatedPdfPath) {
      return res.status(404).json({ error: 'Translated PDF not found' })
    }
    if (fs.existsSync(project.translatedPdfPath)) {
      res.download(project.translatedPdfPath, `${project.title}_translated.pdf`)
    } else {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (error) {
    next(error)
  }
}
