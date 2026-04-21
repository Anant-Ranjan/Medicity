import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  contact: string;
  isVerified: boolean;
  
  // Live Telemetry
  bedTelemetry: {
    icu: { total: number; occupied: number };
    general: { total: number; occupied: number };
    pediatric: { total: number; occupied: number };
  };
  
  // Machinery Status
  machinery: {
    mri: { status: 'Operational' | 'Maintenance' | 'Offline'; count: number };
    ctScanner: { status: 'Operational' | 'Maintenance' | 'Offline'; count: number };
    dialysis: { status: 'Operational' | 'Maintenance' | 'Offline'; count: number };
    ecmo: { status: 'Operational' | 'Maintenance' | 'Offline'; count: number };
    ventilators: { total: number; available: number };
  };
  
  // Traffic / Wait Times
  currentERWaitTimeMinutes: number;
  lastUpdated: Date;
}

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  address: { type: String, required: true },
  contact: { type: String },
  isVerified: { type: Boolean, default: false },
  
  bedTelemetry: {
    icu: { total: { type: Number, default: 0 }, occupied: { type: Number, default: 0 } },
    general: { total: { type: Number, default: 0 }, occupied: { type: Number, default: 0 } },
    pediatric: { total: { type: Number, default: 0 }, occupied: { type: Number, default: 0 } },
  },
  
  machinery: {
    mri: { status: { type: String, enum: ['Operational', 'Maintenance', 'Offline'], default: 'Operational' }, count: { type: Number, default: 0 } },
    ctScanner: { status: { type: String, enum: ['Operational', 'Maintenance', 'Offline'], default: 'Operational' }, count: { type: Number, default: 0 } },
    dialysis: { status: { type: String, enum: ['Operational', 'Maintenance', 'Offline'], default: 'Operational' }, count: { type: Number, default: 0 } },
    ecmo: { status: { type: String, enum: ['Operational', 'Maintenance', 'Offline'], default: 'Operational' }, count: { type: Number, default: 0 } },
    ventilators: { total: { type: Number, default: 0 }, available: { type: Number, default: 0 } },
  },
  
  currentERWaitTimeMinutes: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Geospatial Index for optimal routing and nearest hospital queries
TenantSchema.index({ location: '2dsphere' });

export const Tenant: Model<ITenant> = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);
