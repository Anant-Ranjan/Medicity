import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'super_admin' | 'hospital_admin' | 'general_user';

export interface IUser extends Document {
  email: string;
  passwordHash: string; // In production, use bcrypt
  role: UserRole;
  tenantId?: mongoose.Types.ObjectId; // Only applicable for hospital_admin
  firstName: string;
  lastName: string;
  
  // General User Preferences
  savedPreferences?: {
    defaultLocation?: {
      type: 'Point';
      coordinates: [number, number];
    };
    preferredRadiusKm?: number;
    medicineAlerts?: string[];
  };
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'hospital_admin', 'general_user'], default: 'general_user' },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' }, // Strict data isolation link
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  
  savedPreferences: {
    defaultLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    preferredRadiusKm: { type: Number, default: 20 },
    medicineAlerts: [{ type: String }],
  }
}, {
  timestamps: true
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
