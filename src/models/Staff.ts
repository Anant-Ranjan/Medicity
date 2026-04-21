import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStaffShift {
  startTime: Date;
  endTime: Date;
  status: 'Scheduled' | 'On-Duty' | 'Completed' | 'Absent';
}

export interface IStaff extends Document {
  tenantId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  specialty: string; // e.g., 'Neurologist', 'Trauma Surgeon'
  contactNumber: string;
  isAvailableForEmergency: boolean;
  shifts: IStaffShift[];
}

const StaffSchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialty: { type: String, required: true, index: true },
  contactNumber: { type: String },
  isAvailableForEmergency: { type: Boolean, default: true },
  shifts: [{
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['Scheduled', 'On-Duty', 'Completed', 'Absent'], default: 'Scheduled' }
  }]
}, {
  timestamps: true
});

// Index to quickly find on-duty specialists at specific hospitals
StaffSchema.index({ tenantId: 1, specialty: 1, 'shifts.status': 1 });

export const Staff: Model<IStaff> = mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);
