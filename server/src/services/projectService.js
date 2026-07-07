import { prisma } from '../db/client.js'

// Map a DB row to the shape the frontend expects (snake_case fields).
export function toApiProject(project) {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    created_at: project.createdAt.toISOString(),
    pdf_url: project.pdfPath,
    translated_pdf_url: project.translatedPdfPath,
  }
}

export function listProjects(userId) {
  return prisma.project
    .findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    .then((rows) => rows.map(toApiProject))
}

export function getProject(id) {
  return prisma.project.findUnique({ where: { id } })
}

export function createProject({ userId, title, pdfPath }) {
  return prisma.project.create({
    data: { userId, title, pdfPath, status: 'pending' },
  })
}

export function updateProject(id, data) {
  return prisma.project.update({ where: { id }, data })
}
