import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    pactDaysPerWeek: { type: Number, min: 1, max: 7, default: 4 },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    // Belt and braces: even a raw res.json(user) can never leak the hash.
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
