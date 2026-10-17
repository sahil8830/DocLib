const { v2: cloudinary } = require('cloudinary')
const fs = require('fs')

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const cloudinaryService = {
    /**
     * Upload a local file to Cloudinary.
     * @param {string} localFilePath - Absolute path of the temp file on disk.
     * @param {string} cloudKey      - Destination public_id in Cloudinary (e.g. "uploads/uuid-file").
     * @param {string} mimeType      - MIME type of the file (not used directly, Cloudinary auto-detects).
     * @returns {string} The secure public URL of the uploaded file.
     */
    async uploadFile(localFilePath, cloudKey, mimeType) {
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'raw',       // required for PDF, DOCX, TXT (non-image files)
            public_id: cloudKey.replace(/\.[^/.]+$/, ''),  // strip extension — Cloudinary adds it
            overwrite: true,
            folder: '',                 // cloudKey already has path (e.g. uploads/userId/docId-file)
        })
        return result.secure_url
    },

    /**
     * Delete a file from Cloudinary.
     * @param {string} cloudKey - The public_id / path used during upload.
     */
    async deleteFile(cloudKey) {
        // Strip extension for public_id lookup
        const publicId = cloudKey.replace(/\.[^/.]+$/, '')
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
    },

    /**
     * Get a direct URL for a file (Cloudinary URLs are always public).
     * Mirrors the s3Service.getPresignedUrl signature for drop-in compatibility.
     * @param {string} cloudKey - The public_id used during upload.
     * @returns {string} The secure public URL.
     */
    async getPresignedUrl(cloudKey) {
        const publicId = cloudKey.replace(/\.[^/.]+$/, '')
        return cloudinary.url(publicId, {
            resource_type: 'raw',
            secure: true,
        })
    },
}

module.exports = { cloudinaryService }
