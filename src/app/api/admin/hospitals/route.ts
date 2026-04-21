import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Tenant } from '@/models/Tenant';
import { cookies } from 'next/headers';

async function superAdminGuard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'super_admin') return null;
  return decoded;
}

// GET — list all hospitals with full details
export async function GET() {
  try {
    if (!await superAdminGuard()) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    await connectToDatabase();
    const hospitals = await Tenant.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, hospitals });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST — create a new hospital (tenant)
export async function POST(req: Request) {
  try {
    if (!await superAdminGuard()) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    await connectToDatabase();
    const body = await req.json();
    const { name, address, contact, longitude, latitude,
            icuTotal, generalTotal, pediatricTotal, erWait } = body;

    if (!name || !address || longitude == null || latitude == null) {
      return NextResponse.json({ success: false, error: 'name, address, longitude and latitude are required' }, { status: 400 });
    }

    const hospital = new Tenant({
      name, address, contact: contact || '',
      location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      isVerified: true,
      bedTelemetry: {
        icu:       { total: Number(icuTotal) || 0,      occupied: 0 },
        general:   { total: Number(generalTotal) || 0,  occupied: 0 },
        pediatric: { total: Number(pediatricTotal) || 0, occupied: 0 },
      },
      machinery: {
        mri:        { status: 'Operational', count: 0 },
        ctScanner:  { status: 'Operational', count: 0 },
        dialysis:   { status: 'Operational', count: 0 },
        ecmo:       { status: 'Operational', count: 0 },
        ventilators:{ total: 0, available: 0 },
      },
      currentERWaitTimeMinutes: Number(erWait) || 0,
    });
    await hospital.save();
    return NextResponse.json({ success: true, hospital });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// PATCH — update any hospital field by id
export async function PATCH(req: Request) {
  try {
    if (!await superAdminGuard()) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    await connectToDatabase();
    const { id, updates } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const hospital = await Tenant.findByIdAndUpdate(id, { $set: { ...updates, lastUpdated: new Date() } }, { new: true, runValidators: true });
    if (!hospital) return NextResponse.json({ success: false, error: 'Hospital not found' }, { status: 404 });
    return NextResponse.json({ success: true, hospital });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE — remove a hospital by id
export async function DELETE(req: Request) {
  try {
    if (!await superAdminGuard()) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    await connectToDatabase();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    await Tenant.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
