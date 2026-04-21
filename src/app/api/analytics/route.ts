import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Tenant } from '@/models/Tenant';
import { EpidemiologyRecord } from '@/models/Epidemiology';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Super Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const tenants = await Tenant.find({}, 'name location bedTelemetry').lean();
    const outbreaks = await EpidemiologyRecord.find({}).sort({ reportDate: -1 }).lean();

    // ── ICU Sector Aggregation ──────────────────────────────────────
    let totalICU = 0;
    let totalOccupiedICU = 0;
    const sectors = [
      { name: 'North Sector', cap: 0, total: 0, occupied: 0, color: 'bg-rose-500' },
      { name: 'Central Hub',  cap: 0, total: 0, occupied: 0, color: 'bg-emerald-500' },
      { name: 'East District', cap: 0, total: 0, occupied: 0, color: 'bg-blue-500' },
    ];

    tenants.forEach((tenant: any) => {
      const icuTotal = tenant.bedTelemetry?.icu?.total || 0;
      const icuOccupied = tenant.bedTelemetry?.icu?.occupied || 0;
      totalICU += icuTotal;
      totalOccupiedICU += icuOccupied;
      const lon = tenant.location.coordinates[0];
      if (lon < -73.99) { sectors[1].total += icuTotal; sectors[1].occupied += icuOccupied; }
      else if (lon > -73.95) { sectors[2].total += icuTotal; sectors[2].occupied += icuOccupied; }
      else { sectors[0].total += icuTotal; sectors[0].occupied += icuOccupied; }
    });

    sectors.forEach(sec => {
      sec.cap = sec.total > 0 ? Math.round((sec.occupied / sec.total) * 100) : 0;
      if (sec.cap > 90) sec.color = 'bg-rose-600 animate-pulse';
    });

    // ── Disease Aggregation ────────────────────────────────────────
    // 1. By disease name (total cases)
    const diseaseMap: Record<string, { totalCases: number; category: string; hospitals: Set<string>; severity: any; ageGroup: any }> = {};
    outbreaks.forEach((ob: any) => {
      if (!diseaseMap[ob.diseaseName]) {
        diseaseMap[ob.diseaseName] = {
          totalCases: 0, category: ob.category || 'Other',
          hospitals: new Set(),
          severity: { mild: 0, moderate: 0, severe: 0, critical: 0 },
          ageGroup: { children: 0, adults: 0, elderly: 0 },
        };
      }
      const d = diseaseMap[ob.diseaseName];
      d.totalCases += ob.caseCount;
      d.hospitals.add(ob.tenantName || 'Unknown');
      if (ob.severityBreakdown) {
        d.severity.mild += ob.severityBreakdown.mild || 0;
        d.severity.moderate += ob.severityBreakdown.moderate || 0;
        d.severity.severe += ob.severityBreakdown.severe || 0;
        d.severity.critical += ob.severityBreakdown.critical || 0;
      }
      if (ob.ageGroupBreakdown) {
        d.ageGroup.children += ob.ageGroupBreakdown.children || 0;
        d.ageGroup.adults += ob.ageGroupBreakdown.adults || 0;
        d.ageGroup.elderly += ob.ageGroupBreakdown.elderly || 0;
      }
    });

    const diseaseStats = Object.entries(diseaseMap)
      .map(([name, val]) => ({ name, ...val, hospitals: Array.from(val.hospitals) }))
      .sort((a, b) => b.totalCases - a.totalCases);

    // 2. By hospital (sorted by total case burden)
    const hospitalMap: Record<string, { tenantName: string; totalCases: number; diseases: Record<string, number> }> = {};
    outbreaks.forEach((ob: any) => {
      const key = ob.tenantId?.toString();
      if (!hospitalMap[key]) hospitalMap[key] = { tenantName: ob.tenantName || 'Unknown', totalCases: 0, diseases: {} };
      hospitalMap[key].totalCases += ob.caseCount;
      hospitalMap[key].diseases[ob.diseaseName] = (hospitalMap[key].diseases[ob.diseaseName] || 0) + ob.caseCount;
    });

    const hospitalStats = Object.values(hospitalMap).sort((a, b) => b.totalCases - a.totalCases);

    return NextResponse.json({
      success: true,
      metrics: {
        totalHospitals: tenants.length,
        globalICURatio: totalICU > 0 ? (totalOccupiedICU / totalICU) * 100 : 0,
        sectors,
        totalReportedCases: outbreaks.reduce((s: number, o: any) => s + o.caseCount, 0),
      },
      outbreaks,
      diseaseStats,
      hospitalStats,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
