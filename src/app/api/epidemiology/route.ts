import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { EpidemiologyRecord } from '@/models/Epidemiology';
import { Tenant } from '@/models/Tenant';
import { cookies } from 'next/headers';

// GET: Fetch this hospital's own epidemiology records
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !['hospital_admin', 'super_admin'].includes(decoded.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const query = decoded.role === 'super_admin' ? {} : { tenantId: decoded.tenantId };
    const records = await EpidemiologyRecord.find(query).sort({ reportDate: -1 }).limit(50).lean();

    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit a new epidemiology report
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !['hospital_admin', 'super_admin'].includes(decoded.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!decoded.tenantId) {
      return NextResponse.json({ success: false, error: 'No hospital associated with this account' }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch the tenant to get its location + name
    const tenant = await Tenant.findById(decoded.tenantId).select('name location').lean() as any;
    if (!tenant) return NextResponse.json({ success: false, error: 'Hospital not found' }, { status: 404 });

    const body = await request.json();

    const { diseaseName, category, caseCount, severityBreakdown, ageGroupBreakdown, reportPeriod, notes } = body;

    if (!diseaseName || !category || caseCount == null) {
      return NextResponse.json({ success: false, error: 'Missing required fields: diseaseName, category, caseCount' }, { status: 400 });
    }

    // Validate that severity counts add up to caseCount
    const severityTotal = (severityBreakdown?.mild || 0) + (severityBreakdown?.moderate || 0) +
      (severityBreakdown?.severe || 0) + (severityBreakdown?.critical || 0);
    if (severityTotal > caseCount) {
      return NextResponse.json({ success: false, error: 'Severity breakdown total exceeds caseCount' }, { status: 400 });
    }

    const record = new EpidemiologyRecord({
      tenantId: decoded.tenantId,
      tenantName: tenant.name,
      diseaseName,
      category,
      caseCount,
      severityBreakdown: severityBreakdown || { mild: 0, moderate: 0, severe: 0, critical: 0 },
      ageGroupBreakdown: ageGroupBreakdown || { children: 0, adults: 0, elderly: 0 },
      reportPeriod: reportPeriod || 'daily',
      location: tenant.location,
      notes: notes || '',
    });

    await record.save();

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
