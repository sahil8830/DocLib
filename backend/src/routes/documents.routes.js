const { Router } = require('express')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { upload } = require('../middleware/upload.middleware')
const { authMiddleware } = require('../middleware/auth.middleware')
const { aiService } = require('../services/ai.service')
const { documentStore } = require('../services/store.service')
const { s3Service } = require('../services/s3.service')

const router = Router()

// All document routes require authentication
router.use(authMiddleware)

// Upload a document
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  const userId = req.user.id                         // ← from JWT
  const documentId = uuidv4()

  // User-scoped S3 key: uploads/{userId}/{documentId}-{filename}
  const s3Key = `uploads/${userId}/${documentId}-${req.file.originalname.replace(/\s+/g, '_')}`

  // Upload to S3
  let s3Url
  try {
    s3Url = await s3Service.uploadFile(req.file.path, s3Key, req.file.mimetype)
  } catch (err) {
    return res.status(500).json({ error: 'S3 upload failed: ' + err.message })
  }

  const record = {
    id: documentId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    type: path.extname(req.file.originalname).replace('.', '').toLowerCase(),
    uploadedAt: new Date().toISOString(),
    status: 'processing',
    filePath: req.file.path,
    s3Key,
    s3Url,
    userId,                                           // ← tag with owner
  }

  await documentStore.add(record)

  res.status(202).json({
    documentId,
    filename: req.file.originalname,
    status: 'processing',
    message: 'Document received and is being processed',
  })

  // Process asynchronously
  try {
    const result = await aiService.ingestDocument(
      req.file.path, documentId, req.file.originalname, userId  // ← pass userId
    )
    await documentStore.update(documentId, { status: 'ready', chunks: result.chunks_created })
    console.log(`✅ Document ready: ${req.file.originalname} (${result.chunks_created} chunks)`)

    // Clean up local temp file after ingestion
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
  } catch (err) {
    await documentStore.update(documentId, { status: 'failed' })
    console.error(`❌ Ingestion failed: ${err.message}`)
  }
})

// List documents — only this user's documents
router.get('/', async (req, res) => {
  const documents = await documentStore.list(req.user.id)   // ← scoped
  res.json({ documents })
})

// Get document status — only if owned by this user
router.get('/:id/status', async (req, res) => {
  const doc = await documentStore.get(String(req.params.id), req.user.id)  // ← scoped
  if (!doc) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.json({ id: doc.id, status: doc.status, chunks: doc.chunks })
})

// Delete a document — only if owned by this user
router.delete('/:id', async (req, res) => {
  const docId = String(req.params.id)
  const doc = await documentStore.get(docId, req.user.id)   // ← scoped
  if (!doc) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  try {
    await aiService.deleteDocument(docId, req.user.id)       // ← scoped

    // Delete from S3
    if (doc.s3Key) {
      await s3Service.deleteFile(doc.s3Key)
      console.log(`🗑️ Deleted from S3: ${doc.s3Key}`)
    }

    // Clean up any remaining local file
    if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath)

    await documentStore.delete(docId)
    res.json({ status: 'deleted', id: docId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
