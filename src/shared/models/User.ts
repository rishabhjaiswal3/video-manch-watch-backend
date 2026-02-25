import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  userType: 'user' | 'creator' | 'admin';
  roles: Array<'user' | 'creator' | 'admin'>;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    userType: {
      type: String,
      enum: ['user', 'creator', 'admin'],
      default: 'user',
    },
    roles: {
      type: [String],
      enum: ['user', 'creator', 'admin'],
      default: ['user'],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Keep role array and active role aligned for backward compatibility.
UserSchema.pre('save', function (next) {
  const roleSet = new Set(this.roles || []);
  if (this.userType) {
    roleSet.add(this.userType);
  }
  if (!roleSet.size) {
    roleSet.add('user');
  }
  this.roles = Array.from(roleSet) as Array<'user' | 'creator' | 'admin'>;
  if (!this.roles.includes(this.userType)) {
    this.userType = this.roles[0];
  }
  next();
});

// Compare candidate password against stored hash
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
