import { spawn } from 'child_process'
import path from 'path'

import { PYTHON_DIR, VENV_PYTHON, WORK_DIR } from '../config/env.js'
import { updateProject } from './projectService.js'

// Runs the Python pipeline as a subprocess in its own per-project work dir.
// Fire-and-forget for now; a real job queue replaces this in Phase 3.
export function runPipeline(project) {
  const workDir = path.join(WORK_DIR, project.id)
  const args = [
    '-m',
    'pipeline.run',
    '--pdf',
    project.pdfPath,
    '--work-dir',
    workDir,
    '--project-id',
    project.id,
  ]

  console.log(`Starting pipeline for project ${project.id}...`)
  const proc = spawn(VENV_PYTHON, args, { cwd: PYTHON_DIR, stdio: 'inherit' })

  proc.on('close', async (code) => {
    try {
      if (code === 0) {
        await updateProject(project.id, {
          status: 'completed',
          translatedPdfPath: path.join(workDir, 'output.pdf'),
        })
        console.log(`Pipeline completed for project ${project.id}`)
      } else {
        await updateProject(project.id, { status: 'failed' })
        console.error(`Pipeline for project ${project.id} exited with code ${code}`)
      }
    } catch (error) {
      console.error(`Failed to update project ${project.id} after pipeline:`, error)
    }
  })

  proc.on('error', async (error) => {
    await updateProject(project.id, { status: 'failed' }).catch(() => {})
    console.error(`Pipeline failed to start for project ${project.id}:`, error)
  })
}
