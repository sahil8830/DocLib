const { v2: cloudinary } = require('cloudinary')
const fs = require('fs')

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const cloudinaryService = {
    async uploadFile(localFilePath, cloudKey, mimeType) {
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'raw',
            public_id: cloudKey.replace(/\.[^/.]+$/, ''),
            overwrite: true,
            use_filename: false,
            access_mode: 'public',
            type: 'upload',
        })
        return result.secure_url
    },

    /**
     * Generate a signed download URL (valid for 1 hour).
     * Used to give the AI service on Render temporary access to download files.
     */
    getSignedDownloadUrl(cloudKey) {
        const publicId = cloudKey.replace(/\.[^/.]+$/, '')
        return cloudinary.utils.private_download_url(publicId, 'raw', {
            resource_type: 'raw',
            expires_at: Math.floor(Date.now() / 1000) + 3600,  // 1 hour
        })
    },

    async deleteFile(cloudKey) {
        const publicId = cloudKey.replace(/\.[^/.]+$/, '')
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
    },

    async getPresignedUrl(cloudKey) {
        const publicId = cloudKey.replace(/\.[^/.]+$/, '')
        return cloudinary.url(publicId, {
            resource_type: 'raw',
            secure: true,
        })
    },
}

module.exports = { cloudinaryService }
