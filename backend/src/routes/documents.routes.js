const { Router } = require('express')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { upload } = require('../middleware/upload.middleware')
const { authMiddleware } = require('../middleware/auth.middleware')
const { aiService } = require('../services/ai.service')
const { documentStore } = require('../services/store.service')

// ── Storage: swap between S3 and Cloudinary via env var ──────────────────────
const useCloudinary = process.env.USE_CLOUDINARY === 'true'
const storageService = useCloudinary
  ? require('../services/cloudinary.service').cloudinaryService
  : require('../services/s3.service').s3Service
console.log(`📦 Storage: ${useCloudinary ? 'Cloudinary' : 'AWS S3'}`)


const router = Router()

// All document routes require authentication
router.use(authMiddleware)

// Upload a document
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  const userId = req.user.id
  const documentId = uuidv4()
  const ext = path.extname(req.file.originalname)

  // Write buffer to /tmp — the only writable dir on Vercel serverless
  const tmpPath = path.join('/tmp', `${documentId}${ext}`)
  fs.writeFileSync(tmpPath, req.file.buffer)

  // User-scoped storage key
  const fileKey = `uploads/${userId}/${documentId}-${req.file.originalname.replace(/\s+/g, '_')}`

  // Upload to storage (S3 or Cloudinary) from /tmp
  let fileUrl
  try {
    fileUrl = await storageService.uploadFile(tmpPath, fileKey, req.file.mimetype)
  } catch (err) {
    console.error('❌ Storage upload error:', err.message, err.http_code || '', JSON.stringify(err.error || ''))
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    return res.status(500).json({ error: 'Storage upload failed: ' + err.message })
  }

  const record = {
    id: documentId,
    filename: `${documentId}${ext}`,
    originalName: req.file.originalname,
    size: req.file.size,
    type: ext.replace('.', '').toLowerCase(),
    uploadedAt: new Date().toISOString(),
    status: 'processing',
    filePath: tmpPath,
    s3Key: fileKey,
    s3Url: fileUrl,
    userId,
  }

  await documentStore.add(record)

  // Complete ingestion before responding so serverless execution stays active.
  try {
    // Generate signed URL so AI service on Render can download from Cloudinary
    const downloadUrl = useCloudinary
      ? storageService.getSignedDownloadUrl(fileKey)
      : fileUrl
    const result = await aiService.ingestDocument(
      tmpPath, documentId, req.file.originalname, userId, downloadUrl
    )
    await documentStore.update(documentId, { status: 'ready', chunks: result.chunks_created })
    console.log(`✅ Document ready: ${req.file.originalname} (${result.chunks_created} chunks)`)
    res.status(201).json({
      documentId,
      filename: req.file.originalname,
      status: 'ready',
      chunks: result.chunks_created,
      message: 'Document processed successfully',
    })
  } catch (err) {
    await documentStore.update(documentId, { status: 'failed' })
    console.error(`❌ Ingestion failed: ${err.message}`)
    res.status(502).json({
      documentId,
      status: 'failed',
      error: err.response?.data?.detail || 'AI service could not process this document. Please try again.',
    })
  } finally {
    // Always clean up /tmp
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
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

    // Delete from storage (S3 or Cloudinary)
    if (doc.s3Key) {
      await storageService.deleteFile(doc.s3Key)
      console.log(`🗑️ Deleted from storage: ${doc.s3Key}`)
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
