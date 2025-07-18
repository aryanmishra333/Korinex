import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') })

import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { spawn } from 'child_process'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const app = express()
const PORT = process.env.PORT || 3001

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-key'
)

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// Create necessary directories
const dirs = ['uploads', 'input', 'output', 'ocr_results', 'translations', 'overlayed']
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

// API Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, userId } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Insert project into database
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: userId,
        title: title,
        status: 'pending',
        pdf_url: file.path
      }])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Database error' })
    }

    res.json({ projectId: data.id })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
})

app.post('/api/translate/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params

    // Get project from database
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Update status to processing
    await supabase
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', projectId)

    // Start translation process
    processTranslation(project)

    res.json({ success: true })
  } catch (error) {
    console.error('Translation error:', error)
    res.status(500).json({ error: 'Translation failed' })
  }
})

app.get('/api/status/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(project)
  } catch (error) {
    console.error('Status error:', error)
    res.status(500).json({ error: 'Status check failed' })
  }
})

app.get('/api/download/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error || !project || !project.translated_pdf_url) {
      return res.status(404).json({ error: 'Translated PDF not found' })
    }

    const filePath = project.translated_pdf_url
    if (fs.existsSync(filePath)) {
      res.download(filePath, `${project.title}_translated.pdf`)
    } else {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({ error: 'Download failed' })
  }
})

// Translation processing function
async function processTranslation(project) {
  try {
    // Copy uploaded file to input directory
    const inputPath = path.join('input', 'main-raw.pdf')
    fs.copyFileSync(project.pdf_url, inputPath)

    // Clear previous outputs
    const outputDirs = ['output', 'ocr_results', 'translations', 'overlayed']
    outputDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true })
        fs.mkdirSync(dir, { recursive: true })
      }
    })

    // Run Python scripts sequentially
    console.log('Starting translation process...')
    
    // Step 1: Extract images
    await runPythonScript(path.join('..', 'python', 'main.py'))
    console.log('Images extracted')

    // Step 2: OCR
    await runPythonScript(path.join('..', 'python', 'ocr.py'))
    console.log('OCR completed')

    // Step 3: Translation
    await runPythonScript(path.join('..', 'python', 'translate.py'))
    console.log('Translation completed')

    // Step 4: Overlay (you'll need to implement this)
    await runPythonScript(path.join('..', 'python', 'overlay.py'))
    console.log('Overlay completed')

    // Step 5: Create PDF
    await runPythonScript(path.join('..', 'python', 'create_Overlayed_pdf.py'))
    console.log('PDF created')

    // Update project status
    const translatedPdfPath = 'final_translated_output.pdf'
    await supabase
      .from('projects')
      .update({ 
        status: 'completed',
        translated_pdf_url: translatedPdfPath
      })
      .eq('id', project.id)

    console.log('Translation process completed successfully')
  } catch (error) {
    console.error('Translation process failed:', error)
    
    // Update project status to failed
    await supabase
      .from('projects')
      .update({ status: 'failed' })
      .eq('id', project.id)
  }
}

function runPythonScript(scriptName) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptName], {
      stdio: 'inherit'
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Python script ${scriptName} exited with code ${code}`))
      }
    })

    pythonProcess.on('error', (error) => {
      reject(error)
    })
  })
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})