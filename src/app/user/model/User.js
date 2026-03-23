import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    password: { type: String, required: true, minlength: 8 },
    userType: { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
    roles: { type: [String], enum: ['user', 'creator', 'admin'], default: ['user'] },
    isBlocked: { type: Boolean, default: false },
    refreshTokens: {
      type: [
        {
          tokenHash: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
          expiresAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.pre('save', function (next) {
  const roleSet = new Set(this.roles || []);
  if (this.userType) roleSet.add(this.userType);
  if (!roleSet.size) roleSet.add('user');
  this.roles = Array.from(roleSet);
  if (!this.roles.includes(this.userType)) this.userType = this.roles[0];
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

UserSchema.statics.findByRefreshTokenHash = function (hash) {
  return this.findOne({ 'refreshTokens.tokenHash': hash });
};

UserSchema.methods.removeExpiredRefreshTokens = function () {
  const now = Date.now();
  this.refreshTokens = (this.refreshTokens || []).filter((entry) => entry.expiresAt && entry.expiresAt.getTime() > now);
};

UserSchema.methods.pruneRefreshTokens = function (max) {
  this.removeExpiredRefreshTokens();
  this.refreshTokens = (this.refreshTokens || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, max);
};

UserSchema.methods.addRefreshToken = function (tokenHash, expiresAt) {
  this.refreshTokens.push({
    tokenHash,
    createdAt: new Date(),
    expiresAt,
  });
};

UserSchema.methods.removeRefreshToken = function (hash) {
  this.refreshTokens = (this.refreshTokens || []).filter((entry) => entry.tokenHash !== hash);
};

export const User = mongoose.model('User', UserSchema);
