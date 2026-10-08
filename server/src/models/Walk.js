import mongoose from 'mongoose';

const walkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // the IST date, 'YYYY-MM-DD'
  quest: { type: String, required: true },
  checkedAt: { type: Date, required: true },
});

// One counted walk per person per day: a second one for the same date is a 409.
walkSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Walk = mongoose.models.Walk ?? mongoose.model('Walk', walkSchema);
