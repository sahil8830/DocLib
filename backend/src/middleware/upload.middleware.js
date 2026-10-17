const multer = require('multer')
const path = require('path')

const fileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.txt', '.md']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`))
  }
}

// Use memoryStorage — Vercel's filesystem is read-only (/tmp is the only writable dir)
// File buffer is available at req.file.buffer after upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
})

module.exports = { upload }
