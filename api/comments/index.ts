import {
  createComment,
  listComments,
  sendMethodNotAllowed,
} from '../_lib/comments'

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      await listComments(req, res)
      return
    }

    if (req.method === 'POST') {
      await createComment(req, res)
      return
    }

    sendMethodNotAllowed(res, ['GET', 'POST'])
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Server error.',
    })
  }
}
