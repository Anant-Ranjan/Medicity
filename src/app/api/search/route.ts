import { NextResponse } from 'next/server';
import { findOptimalEmergencyRoute, RouteParams } from '@/services/routing';
import connectToDatabase from '@/lib/db';
import { EpidemiologyRecord } from '@/models/Epidemiology';

// ── NLP Intent Classification ───────────────────────────────────────────────

const DISEASE_KEYWORDS = [
  'dengue', 'malaria', 'flu', 'influenza', 'covid', 'typhoid', 'cholera',
  'tuberculosis', 'tb', 'hepatitis', 'chikungunya', 'pneumonia', 'fever',
  'disease', 'infection', 'outbreak', 'epidemic', 'cases', 'patients'
];

const STAT_QUERY_PHRASES = [
  'how many', 'number of', 'count of', 'total', 'statistics', 'stats',
  'reported', 'cases near', 'outbreak near', 'patients with', 'affected by',
  'how bad', 'spread of', 'incidence of', 'prevalence of'
];

const SPECIALTY_MAP: Record<string, string> = {
  'pediatric': 'Pediatrician', 'child': 'Pediatrician', 'children': 'Pediatrician',
  'heart': 'Cardiologist', 'cardio': 'Cardiologist', 'cardiac': 'Cardiologist',
  'brain': 'Neurologist', 'neuro': 'Neurologist', 'stroke': 'Neurologist',
  'bone': 'Orthopedic', 'fracture': 'Orthopedic', 'orthopedic': 'Orthopedic',
  'eye': 'Ophthalmologist', 'vision': 'Ophthalmologist',
  'skin': 'Dermatologist', 'rash': 'Dermatologist',
  'cancer': 'Oncologist', 'tumor': 'Oncologist', 'oncology': 'Oncologist',
  'kidney': 'Nephrologist', 'dialysis': 'Nephrologist',
  'lung': 'Pulmonologist', 'breath': 'Pulmonologist', 'asthma': 'Pulmonologist',
  'surgery': 'Surgeon', 'surgeon': 'Surgeon', 'trauma': 'Trauma Surgeon',
  'mental': 'Psychiatrist', 'psychiatry': 'Psychiatrist',
  'pregnancy': 'Gynecologist', 'maternity': 'Gynecologist', 'obstetric': 'Gynecologist',
};

const MACHINERY_MAP: Record<string, string> = {
  'mri': 'mri', 'magnetic': 'mri',
  'ct': 'ctScanner', 'ct scan': 'ctScanner', 'computed tomography': 'ctScanner',
  'dialysis': 'dialysis', 'kidney machine': 'dialysis',
  'ecmo': 'ecmo', 'heart lung': 'ecmo',
  'ventilator': 'ventilators', 'ventilation': 'ventilators',
};

function extractIntent(rawQuery: string) {
  const q = rawQuery.toLowerCase();

  // ── Detect if this is a disease stats query ──────────────────────────────
  const isStatQuery =
    STAT_QUERY_PHRASES.some(p => q.includes(p)) ||
    (DISEASE_KEYWORDS.some(k => q.includes(k)) && !q.includes('hospital') && !q.includes('doctor') && !q.includes('icu') && !q.includes('ward'));

  // ── Detect disease name ──────────────────────────────────────────────────
  let diseaseName: string | undefined;
  const diseaseNameMap: Record<string, string> = {
    'dengue': 'Dengue Fever', 'malaria': 'Malaria', 'flu': 'Seasonal Flu',
    'influenza': 'Seasonal Flu', 'covid': 'COVID-19', 'typhoid': 'Typhoid',
    'cholera': 'Cholera', 'tuberculosis': 'Tuberculosis', 'tb': 'Tuberculosis',
    'hepatitis a': 'Hepatitis A', 'hepatitis b': 'Hepatitis B',
    'chikungunya': 'Chikungunya', 'pneumonia': 'Pneumonia',
  };
  for (const [kw, name] of Object.entries(diseaseNameMap)) {
    if (q.includes(kw)) { diseaseName = name; break; }
  }

  // ── Detect specialty ─────────────────────────────────────────────────────
  let requiredSpecialty: string | undefined;
  for (const [kw, spec] of Object.entries(SPECIALTY_MAP)) {
    if (q.includes(kw)) { requiredSpecialty = spec; break; }
  }

  // ── Detect machinery ─────────────────────────────────────────────────────
  let requiredMachinery: string | undefined;
  for (const [kw, machine] of Object.entries(MACHINERY_MAP)) {
    if (q.includes(kw)) { requiredMachinery = machine; break; }
  }

  // ── ICU / Emergency ──────────────────────────────────────────────────────
  const needsICU = ['icu', 'intensive care', 'critical', 'emergency', 'urgent', 'severe'].some(k => q.includes(k));

  // ── Radius extraction ────────────────────────────────────────────────────
  const radiusMatch = q.match(/within (\d+)\s*km/);
  const radiusKm = radiusMatch ? parseInt(radiusMatch[1]) : undefined;

  return { isStatQuery, diseaseName, requiredSpecialty, requiredMachinery, needsICU, radiusKm };
}

// ── Route Handler ───────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawQuery: string = body.query || '';
    const userLocation: [number, number] = body.userLocation || [-74.006, 40.7128];
    const isEmergency = body.emergency === true;

    // Active filter overrides from the UI
    const filterOverrides = body.filters || {};

    const intent = extractIntent(rawQuery);

    // Filter UI can force certain intents
    if (filterOverrides.needsICU) intent.needsICU = true;
    if (filterOverrides.requiredSpecialty) intent.requiredSpecialty = filterOverrides.requiredSpecialty;
    if (filterOverrides.requiredMachinery) intent.requiredMachinery = filterOverrides.requiredMachinery;
    if (filterOverrides.maxRadiusKm) intent.radiusKm = filterOverrides.maxRadiusKm;
    if (isEmergency) intent.needsICU = true;

    await connectToDatabase();

    // ── BRANCH 1: Epidemiological Statistics Query ──────────────────────────
    if (intent.isStatQuery && !isEmergency) {
      const filter: any = {};
      if (intent.diseaseName) {
        filter.diseaseName = { $regex: intent.diseaseName, $options: 'i' };
      }

      const records = await EpidemiologyRecord.find(filter)
        .sort({ reportDate: -1 })
        .limit(20)
        .lean();

      // Aggregate by disease
      const aggregated: Record<string, any> = {};
      for (const rec of records as any[]) {
        const key = rec.diseaseName;
        if (!aggregated[key]) {
          aggregated[key] = {
            diseaseName: key,
            category: rec.category || 'Other',
            totalCases: 0, hospitals: [],
            severity: { mild: 0, moderate: 0, severe: 0, critical: 0 },
            ageGroup: { children: 0, adults: 0, elderly: 0 },
            latestReport: rec.reportDate,
          };
        }
        const a = aggregated[key];
        a.totalCases += rec.caseCount;
        if (!a.hospitals.includes(rec.tenantName)) a.hospitals.push(rec.tenantName);
        if (rec.severityBreakdown) {
          a.severity.mild += rec.severityBreakdown.mild || 0;
          a.severity.moderate += rec.severityBreakdown.moderate || 0;
          a.severity.severe += rec.severityBreakdown.severe || 0;
          a.severity.critical += rec.severityBreakdown.critical || 0;
        }
        if (rec.ageGroupBreakdown) {
          a.ageGroup.children += rec.ageGroupBreakdown.children || 0;
          a.ageGroup.adults += rec.ageGroupBreakdown.adults || 0;
          a.ageGroup.elderly += rec.ageGroupBreakdown.elderly || 0;
        }
      }

      const statsResults = Object.values(aggregated).sort((a: any, b: any) => b.totalCases - a.totalCases);

      return NextResponse.json({
        success: true,
        queryType: 'statistics',
        extractedIntent: { diseaseName: intent.diseaseName, isStatQuery: true },
        results: statsResults,
        rawRecordCount: records.length,
      });
    }

    // ── BRANCH 2: Hospital Routing Query ────────────────────────────────────
    const params: RouteParams = {
      userLocation,
      maxRadiusKm: isEmergency ? 30 : (intent.radiusKm || filterOverrides.maxRadiusKm || 50),
      needsICU: intent.needsICU,
      requiredSpecialty: intent.requiredSpecialty,
      requiredMachinery: intent.requiredMachinery as any,
    };

    const results = await findOptimalEmergencyRoute(params);

    // Apply sort override from filters
    let sorted = [...results];
    if (filterOverrides.sortBy === 'wait') {
      sorted.sort((a: any, b: any) => a.hospital.currentERWaitTimeMinutes - b.hospital.currentERWaitTimeMinutes);
    } else if (filterOverrides.sortBy === 'distance') {
      sorted.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
    }

    return NextResponse.json({
      success: true,
      queryType: 'routing',
      extractedIntent: {
        needsICU: intent.needsICU,
        requiredSpecialty: intent.requiredSpecialty,
        requiredMachinery: intent.requiredMachinery,
      },
      results: sorted,
    });

  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
