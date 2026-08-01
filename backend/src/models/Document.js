const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema(
  {
    _id: { type: String }, // uuid supplied by the route
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
    uploadedAt: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    chunks: { type: Number, default: 0 },
    filePath: { type: String, required: true },
    userId: { type: String, default: null }, // optional user association
  },
  {
    _id: false, // we supply our own string _id (uuid)
    timestamps: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

module.exports = mongoose.model('Document', documentSchema)
