import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DB_FILE = path.resolve(process.cwd(), 'comments_db.csv')
const CSV_HEADERS = [
  'id',
  'targetType',
  'targetId',
  'stakeholderCategory',
  'noteText',
  'emailHash',
  'timestamp',
  'displayName',
  'parentId',
]

const escapeCsv = (value) => {
  const text = String(value ?? '')
  if (/[,"\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

const parseCsvLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  values.push(current)
  return values
}

const readDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, `${CSV_HEADERS.join(',')}\n`, 'utf8')
    return []
  }

  const raw = fs.readFileSync(DB_FILE, 'utf8').trim()
  if (!raw) return []
  const lines = raw.split('\n')
  if (lines.length <= 1) return []

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const obj = {}
    CSV_HEADERS.forEach((key, index) => {
      obj[key] = values[index] || ''
    })
    return obj
  })
}

const writeDb = (comments) => {
  const rows = [CSV_HEADERS.join(',')]
  comments.forEach((comment) => {
    rows.push(CSV_HEADERS.map((header) => escapeCsv(comment[header] || '')).join(','))
  })
  fs.writeFileSync(DB_FILE, `${rows.join('\n')}\n`, 'utf8')
}

const redact = (comment) => ({
  id: comment.id,
  targetType: comment.targetType,
  targetId: comment.targetId,
  stakeholderCategory: comment.stakeholderCategory,
  noteText: comment.noteText,
  timestamp: comment.timestamp,
  displayName: comment.displayName,
  parentId: comment.parentId,
})

const commentApiPlugin = () => {
  let comments = readDb()

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

        comments = readDb()

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
          filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
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
            body.displayName,
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
            emailHash: body.emailHash || '',
            timestamp: new Date().toISOString(),
            displayName: body.displayName,
            parentId: body.parentId || '',
          }

          comments.push(comment)
          writeDb(comments)
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
          if (!userHash || userHash !== comment.emailHash) {
            res.statusCode = 403
            res.end('Not authorized')
            return
          }

          comment.noteText = body.noteText || comment.noteText
          comment.timestamp = new Date().toISOString()
          writeDb(comments)
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
          if (!userHash || userHash !== target.emailHash) {
            res.statusCode = 403
            res.end('Not authorized')
            return
          }

          const idsToDelete = new Set([target.id])
          comments.forEach((item) => {
            if (item.parentId === target.id) idsToDelete.add(item.id)
          })

          comments = comments.filter((item) => !idsToDelete.has(item.id))
          writeDb(comments)

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
