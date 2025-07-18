import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Play, Download, RefreshCw, FileText, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Project {
  id: string
  title: string
  created_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  pdf_url: string | null
  translated_pdf_url: string | null
}

export const Project: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [translating, setTranslating] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (id && user) {
      fetchProject()
    }
  }, [id, user])

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const startTranslation = async () => {
    if (!project) return
    
    setTranslating(true)
    try {
      const response = await fetch(`/api/translate/${project.id}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Translation failed')
      }

      // Start polling for status updates
      const interval = setInterval(async () => {
        await fetchProject()
        if (project?.status === 'completed' || project?.status === 'failed') {
          clearInterval(interval)
        }
      }, 2000)

    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setTranslating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />
      case 'processing':
        return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />
      default:
        return <Clock className="w-6 h-6 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Project not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FileText className="w-8 h-8 text-gray-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Translation Status</h3>
                <p className="text-sm text-gray-500">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getStatusColor(project.status)}`}>
              {getStatusIcon(project.status)}
              <span className="font-medium">
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${project.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <span className={project.status === 'pending' ? 'text-yellow-700' : 'text-green-700'}>
                PDF Uploaded
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                project.status === 'processing' || project.status === 'completed' ? 'bg-blue-500' : 'bg-gray-300'
              }`}></div>
              <span className={
                project.status === 'processing' || project.status === 'completed' ? 'text-blue-700' : 'text-gray-500'
              }>
                AI Processing
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${project.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={project.status === 'completed' ? 'text-green-700' : 'text-gray-500'}>
                Translation Complete
              </span>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Actions</h4>
                <p className="text-sm text-gray-500">
                  {project.status === 'pending' ? 'Start the translation process' : 
                   project.status === 'processing' ? 'Translation in progress...' :
                   project.status === 'completed' ? 'Download your translated manhwa' :
                   'Translation failed - try again'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {project.status === 'pending' && (
                  <button
                    onClick={startTranslation}
                    disabled={translating}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                  >
                    {translating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Start Translation</span>
                      </>
                    )}
                  </button>
                )}
                {project.status === 'failed' && (
                  <button
                    onClick={startTranslation}
                    disabled={translating}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Translation</span>
                  </button>
                )}
                {project.status === 'completed' && project.translated_pdf_url && (
                  <a
                    href={`/api/download/${project.id}`}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}