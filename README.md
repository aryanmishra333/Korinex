# Korinex - AI-Powered Korean Manhwa Translator

A complete full-stack SaaS application that translates Korean manhwa (comics) into English using AI technology.

## Features

- **User Authentication**: Secure sign-up and login with Supabase
- **PDF Upload**: Drag-and-drop interface for uploading Korean manhwa PDFs
- **AI Processing**: Automated pipeline for text extraction, translation, and overlay
- **Status Tracking**: Real-time progress monitoring
- **Project Management**: Dashboard for managing translation projects
- **Download System**: Download translated PDFs when complete

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Translation**: Google Gemini API
- **OCR**: easyOCR / pytesseract (Tesseract)
- **PDF Processing**: PyMuPDF (fitz)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project
2. Click "Connect to Supabase" button in the top right
3. Run the database migration:
   - Go to SQL Editor in Supabase dashboard
   - Copy and run the contents of `supabase/migrations/create_projects_table.sql`

### 3. Python Dependencies

```bash
# Install Python dependencies
pip install PyMuPDF easyocr pillow requests
```

### 4. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 5. Run the Application

```bash
# Terminal 1: Frontend (port 5173)
npm run dev

# Terminal 2: Backend (port 3001)
npm run server
```

## How It Works

1. **Upload**: Users upload Korean manhwa PDFs
2. **Extract**: Python script extracts images from PDF
3. **OCR**: EasyOCR detects Korean text and positions
4. **Translate**: Google Gemini translates Korean text to English
5. **Overlay**: English text is overlaid on original images
6. **Generate**: Final translated PDF is created
7. **Download**: Users can download the translated manhwa

## API Endpoints

- `POST /api/upload` - Upload PDF and create project
- `POST /api/translate/:projectId` - Start translation process
- `GET /api/status/:projectId` - Check project status
- `GET /api/download/:projectId` - Download translated PDF

## Project Structure

```
korinex/
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── contexts/          # React contexts
│   ├── lib/               # Utilities
│   └── pages/             # Page components
├── server/                # Node.js backend
├── python/                # Python processing scripts
├── supabase/             # Database migrations
└── public/               # Static assets
```

## Status Flow

1. **Pending**: Project created, ready for translation
2. **Processing**: AI pipeline running
3. **Completed**: Translation finished, PDF ready
4. **Failed**: Error occurred, can retry

## Security Features

- Row Level Security (RLS) on all database tables
- User authentication required for all operations
- File upload validation
- Secure API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
