import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEpidemiologyRecord extends Document {
  tenantId: mongoose.Types.ObjectId;
  tenantName: string;
  diseaseName: string;
  category: string;
  caseCount: number;
  severityBreakdown: {
    mild: number;
    moderate: number;
    severe: number;
    critical: number;
  };
  ageGroupBreakdown: {
    children: number;   // 0-14
    adults: number;     // 15-59
    elderly: number;    // 60+
  };
  reportDate: Date;
  reportPeriod: 'daily' | 'weekly' | 'monthly';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  notes?: string;
  // Note: Strictly no PHI stored here. All counts are anonymous.
}

const EpidemiologySchema: Schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  tenantName: { type: String, required: true },
  diseaseName: { type: String, required: true, index: true },
  category: { type: String, required: true, enum: ['Vector-Borne', 'Respiratory', 'Gastrointestinal', 'Cardiovascular', 'Neurological', 'Other'] },
  caseCount: { type: Number, required: true, min: 0 },
  severityBreakdown: {
    mild: { type: Number, default: 0 },
    moderate: { type: Number, default: 0 },
    severe: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
  },
  ageGroupBreakdown: {
    children: { type: Number, default: 0 },
    adults: { type: Number, default: 0 },
    elderly: { type: Number, default: 0 },
  },
  reportDate: { type: Date, default: Date.now, index: true },
  reportPeriod: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  notes: { type: String }
}, { timestamps: true });

EpidemiologySchema.index({ location: '2dsphere', diseaseName: 1, reportDate: -1 });

export const EpidemiologyRecord: Model<IEpidemiologyRecord> =
  mongoose.models.EpidemiologyRecord ||
  mongoose.model<IEpidemiologyRecord>('EpidemiologyRecord', EpidemiologySchema);
