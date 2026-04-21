import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Tenant } from '@/models/Tenant';
import { Staff } from '@/models/Staff';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'hospital_admin' && decoded.role !== 'super_admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!decoded.tenantId) {
      return NextResponse.json({ success: false, error: 'No associated hospital for this user' }, { status: 404 });
    }

    await connectToDatabase();
    
    const tenantData = await Tenant.findById(decoded.tenantId).lean();
    if (!tenantData) {
      return NextResponse.json({ success: false, error: 'Hospital not found in database' }, { status: 404 });
    }

    const staffData = await Staff.find({ tenantId: decoded.tenantId }).lean();

    return NextResponse.json({ 
      success: true, 
      tenant: tenantData,
      staff: staffData
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
