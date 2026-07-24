import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// server/src/config -> server root is two levels up.
export const SERVER_ROOT = path.resolve(__dirname, '..', '..')
export const REPO_ROOT = path.resolve(SERVER_ROOT, '..')

export const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads')
export const WORK_DIR = path.join(SERVER_ROOT, 'work')

// The translation pipeline is a Python package run with the project's venv.
export const PYTHON_DIR = path.join(REPO_ROOT, 'python')
export const VENV_PYTHON = path.join(PYTHON_DIR, '.venv', 'bin', 'python')

export const PORT = process.env.PORT || 3001

// Interim single-user identity until OAuth (Phase 2c) provides real users.
export const LOCAL_USER_ID = 'local-user'
export const LOCAL_USER_EMAIL = 'local@korinex.dev'

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
export const JWT_SECRET = process.env.JWT_SECRET