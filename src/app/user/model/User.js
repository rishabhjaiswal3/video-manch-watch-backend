import mongoose, { Schema } from 'mongoose';

// Read-only model — users are created and managed by video-manch-backend.
// This model exists solely to look up user data (e.g. email for profile generation)
// from the shared MongoDB instance.
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    userType: { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
    roles: { type: [String], enum: ['user', 'creator', 'admin'], default: ['user'] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

export const User = mongoose.model('User', UserSchema);
