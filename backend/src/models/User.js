const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // ── Email verification ──────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyToken: { type: String, default: null },
    verifyTokenExpiry: { type: Date, default: null },
    // ── Password reset ──────────────────────────────────────────
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        delete ret.verifyToken
        delete ret.verifyTokenExpiry
        delete ret.resetToken
        delete ret.resetTokenExpiry
        return ret
      },
    },
  }
)

module.exports = mongoose.model('User', userSchema)
