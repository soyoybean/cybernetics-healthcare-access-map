import crypto from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const redact = (comment) => ({
  id: comment.id,
  targetType: comment.targetType,
  targetId: comment.targetId,
  stakeholderCategory: comment.stakeholderCategory,
  noteText: comment.noteText,
  contactInfo: comment.contactInfo,
  timestamp: comment.timestamp,
  displayName: comment.displayName,
  parentId: comment.parentId,
})

const commentApiPlugin = () => {
  const comments = []

  const parseBody = (req) => new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
  })

  return {
    name: 'comment-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/comments')) {
          return next()
        }

        const url = new URL(req.url, 'http://localhost')
        const [, , commentId] = url.pathname.split('/')

        if (req.method === 'GET') {
          const targetType = url.searchParams.get('targetType')
          const targetId = url.searchParams.get('targetId')
          const filtered = comments.filter((comment) => {
            if (targetType && comment.targetType !== targetType) return false
            if (targetId && comment.targetId !== targetId) return false
            return true
          })
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(filtered.map(redact)))
          return
        }

        if (req.method === 'POST') {
          const body = await parseBody(req)
          const required = [
            body.targetType,
            body.targetId,
            body.stakeholderCategory,
            body.noteText,
            body.privateUserIdentifier,
          ]

          if (required.some((value) => !value)) {
            res.statusCode = 400
            res.end('Missing required fields')
            return
          }

          const comment = {
            id: crypto.randomUUID(),
            targetType: body.targetType,
            targetId: body.targetId,
            stakeholderCategory: body.stakeholderCategory,
            noteText: body.noteText,
            contactInfo: body.contactInfo || '',
            privateUserIdentifier: body.privateUserIdentifier,
            timestamp: new Date().toISOString(),
            displayName: body.displayName || 'User Comment',
            parentId: body.parentId || '',
          }
          comments.unshift(comment)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(redact(comment)))
          return
        }

        if (req.method === 'PATCH' && commentId) {
          const body = await parseBody(req)
          const userHash = req.headers['x-user-hash']
          const comment = comments.find((item) => item.id === commentId)
          if (!comment) {
            res.statusCode = 404
            res.end('Comment not found')
            return
          }
          if (!userHash || userHash !== comment.privateUserIdentifier) {
            res.statusCode = 403
            res.end('Not authorized')
            return
          }

          comment.noteText = body.noteText || comment.noteText
          comment.timestamp = new Date().toISOString()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(redact(comment)))
          return
        }

        if (req.method === 'DELETE' && commentId) {
          const userHash = req.headers['x-user-hash']
          const commentIndex = comments.findIndex((item) => item.id === commentId)
          if (commentIndex === -1) {
            res.statusCode = 404
            res.end('Comment not found')
            return
          }
          const target = comments[commentIndex]
          if (!userHash || userHash !== target.privateUserIdentifier) {
            res.statusCode = 403
            res.end('Not authorized')
            return
          }

          const idsToDelete = new Set([target.id])
          comments.forEach((item) => {
            if (item.parentId === target.id) idsToDelete.add(item.id)
          })

          for (let i = comments.length - 1; i >= 0; i -= 1) {
            if (idsToDelete.has(comments[i].id)) comments.splice(i, 1)
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
          return
        }

        res.statusCode = 405
        res.end('Method not allowed')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), commentApiPlugin()],
})
