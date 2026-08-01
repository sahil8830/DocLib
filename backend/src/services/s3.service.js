const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const fs = require('fs')

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
})

const BUCKET = process.env.AWS_S3_BUCKET

const s3Service = {
    /**
     * Upload a local file to S3.
     * @param {string} localFilePath - Absolute path of the temp file on disk.
     * @param {string} s3Key         - Destination key in S3 (e.g. "uploads/uuid-file.pdf").
     * @param {string} mimeType      - MIME type of the file.
     * @returns {string} The public S3 URL of the uploaded object.
     */
    async uploadFile(localFilePath, s3Key, mimeType) {
        const fileBuffer = fs.readFileSync(localFilePath)
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: mimeType,
            })
        )
        return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`
    },

    /**
     * Delete an object from S3.
     * @param {string} s3Key - The S3 key of the object to delete.
     */
    async deleteFile(s3Key) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }))
    },

    /**
     * Generate a temporary pre-signed URL for private object access.
     * @param {string} s3Key            - The S3 object key.
     * @param {number} expiresInSeconds - How long the URL is valid (default: 1 hour).
     * @returns {string} Pre-signed URL.
     */
    async getPresignedUrl(s3Key, expiresInSeconds = 3600) {
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key })
        return getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
    },
}

module.exports = { s3Service }
