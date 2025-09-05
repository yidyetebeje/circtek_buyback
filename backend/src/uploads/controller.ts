import { Elysia, t } from 'elysia'
import { s3Service } from '../services/s3.service'
import { bearer } from '@elysiajs/bearer'
import { jwt } from '@elysiajs/jwt'

export const upload_routes = new Elysia({ prefix: '/uploads' })
  .use(bearer())
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'dev_secret',
  }))
  .derive(async ({ bearer, jwt }) => {
    if (!bearer) throw new Error('Unauthorized')
    
    const payload = await jwt.verify(bearer)
    if (!payload) throw new Error('Unauthorized')
    
    return { user: payload }
  })
  .post('/', async ({ body, user }) => {
    try {
      const { file, folder = 'uploads' } = body as { file: File; folder?: string }
      
      if (!file) {
        throw new Error('No file provided')
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`

      // Upload file to S3
      const fileUrl = await s3Service.uploadFile(file, fileName, file.type)

      return {
        success: true,
        data: {
          url: fileUrl,
          fileName: fileName,
          originalName: file.name,
          size: file.size,
          type: file.type
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }, {
    body: t.Object({
      file: t.File(),
      folder: t.Optional(t.String())
    }),
    detail: {
      tags: ['Uploads'],
      summary: 'Upload file to S3',
      description: 'Upload a file to S3 storage and return the file URL'
    }
  })
  .get('/signed-url/:key', async ({ params, query, user }) => {
    try {
      const { key } = params
      const { expiresIn = '3600' } = query as { expiresIn?: string }
      
      const signedUrl = s3Service.getPresignedUrl(key, parseInt(expiresIn))
      
      return {
        success: true,
        data: {
          signedUrl,
          expiresIn: parseInt(expiresIn)
        }
      }
    } catch (error) {
      console.error('Signed URL error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate signed URL'
      }
    }
  }, {
    params: t.Object({
      key: t.String()
    }),
    query: t.Object({
      expiresIn: t.Optional(t.String())
    }),
    detail: {
      tags: ['Uploads'],
      summary: 'Get signed URL for file access',
      description: 'Generate a presigned URL for secure file access'
    }
  })
  .get('/upload-url', async ({ query, user }) => {
    try {
      const { key, contentType = 'application/octet-stream', expiresIn = '3600' } = query as {
        key: string;
        contentType?: string;
        expiresIn?: string;
      }
      
      if (!key) {
        throw new Error('Key parameter is required')
      }
      
      const uploadUrl = s3Service.getPresignedUploadUrl(key, parseInt(expiresIn), contentType)
      
      return {
        success: true,
        data: {
          uploadUrl,
          key,
          expiresIn: parseInt(expiresIn)
        }
      }
    } catch (error) {
      console.error('Upload URL error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate upload URL'
      }
    }
  }, {
    query: t.Object({
      key: t.String(),
      contentType: t.Optional(t.String()),
      expiresIn: t.Optional(t.String())
    }),
    detail: {
      tags: ['Uploads'],
      summary: 'Get presigned upload URL',
      description: 'Generate a presigned URL for direct file upload to S3'
    }
  })
  .delete('/:key', async ({ params, user }) => {
    try {
      const { key } = params
      
      const deleted = await s3Service.deleteFile(key)
      
      return {
        success: true,
        data: {
          deleted,
          key
        }
      }
    } catch (error) {
      console.error('Delete error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      }
    }
  }, {
    params: t.Object({
      key: t.String()
    }),
    detail: {
      tags: ['Uploads'],
      summary: 'Delete file from S3',
      description: 'Delete a file from S3 storage'
    }
  })
