const mongoose = require('mongoose')

const querySchema = new mongoose.Schema(
  {
    _id: { type: String }, // uuid supplied by the route
    question: { type: String, required: true },
    timestamp: { type: String, required: true },
    latencyMs: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    feedback: {
      type: String,
      enum: ['up', 'down', null],
      default: null,
    },
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

module.exports = mongoose.model('Query', querySchema)
