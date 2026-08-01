const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'ai'], required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false }
)

const conversationSchema = new mongoose.Schema(
  {
    _id: { type: String },                           // uuid supplied by the route
    userId: { type: String, required: true },        // owner
    title: { type: String, required: true },         // first user question (truncated)
    messages: { type: [messageSchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    _id: false,
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

module.exports = mongoose.model('Conversation', conversationSchema)
