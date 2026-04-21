import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Tenant } from '@/models/Tenant';
import { EpidemiologyRecord } from '@/models/Epidemiology';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// ── 20 Realistic Indian & US Hospitals ──────────────────────────────────────
const HOSPITALS = [
  { name: 'AIIMS New Delhi', address: 'Ansari Nagar, New Delhi, Delhi 110029', contact: '+91-11-26588500', coords: [77.2090, 28.5672] },
  { name: 'Fortis Escorts Heart Institute', address: 'Okhla Road, New Delhi, Delhi 110025', contact: '+91-11-47135000', coords: [77.2733, 28.5494] },
  { name: 'Apollo Hospital Chennai', address: 'Greams Road, Chennai, Tamil Nadu 600006', contact: '+91-44-28290200', coords: [80.2527, 13.0548] },
  { name: 'Kokilaben Dhirubhai Ambani Hospital', address: 'Andheri West, Mumbai, Maharashtra 400053', contact: '+91-22-30999999', coords: [72.8347, 19.1289] },
  { name: 'Tata Memorial Hospital', address: 'Dr. Ernest Borges Road, Mumbai, Maharashtra 400012', contact: '+91-22-24177000', coords: [72.8404, 18.9988] },
  { name: 'Manipal Hospital Bengaluru', address: 'HAL Airport Road, Bengaluru, Karnataka 560017', contact: '+91-80-25023456', coords: [77.6408, 12.9716] },
  { name: 'Medanta – The Medicity', address: 'Sector 38, Gurugram, Haryana 122001', contact: '+91-124-4141414', coords: [77.0266, 28.4089] },
  { name: 'Narayana Health City', address: 'Bommasandra, Bengaluru, Karnataka 560099', contact: '+91-80-71222222', coords: [77.6845, 12.8399] },
  { name: 'Christian Medical College', address: 'Ida Scudder Road, Vellore, Tamil Nadu 632004', contact: '+91-416-2281000', coords: [79.1300, 12.9165] },
  { name: 'Hyderabad Care Hospitals', address: 'Nampally, Hyderabad, Telangana 500001', contact: '+91-40-66666666', coords: [78.4711, 17.3840] },
  { name: 'NYU Langone Medical Center', address: '550 First Ave, New York, NY 10016', contact: '+1-212-263-7300', coords: [-73.9749, 40.7420] },
  { name: 'Johns Hopkins Hospital', address: '1800 Orleans St, Baltimore, MD 21287', contact: '+1-410-955-5000', coords: [-76.5926, 39.2960] },
  { name: 'Mayo Clinic Rochester', address: '200 First St SW, Rochester, MN 55905', contact: '+1-507-284-2511', coords: [-92.4668, 44.0225] },
  { name: 'Cleveland Clinic', address: '9500 Euclid Ave, Cleveland, OH 44195', contact: '+1-216-444-2200', coords: [-81.6193, 41.5022] },
  { name: 'Mass General Hospital', address: '55 Fruit St, Boston, MA 02114', contact: '+1-617-726-2000', coords: [-71.0687, 42.3631] },
  { name: 'Cedars-Sinai Medical Center', address: '8700 Beverly Blvd, Los Angeles, CA 90048', contact: '+1-310-423-3277', coords: [-118.3806, 34.0751] },
  { name: 'Mount Sinai Hospital NY', address: '1 Gustave Levy Pl, New York, NY 10029', contact: '+1-212-241-6500', coords: [-73.9526, 40.7900] },
  { name: 'Stanford Health Care', address: '300 Pasteur Dr, Stanford, CA 94305', contact: '+1-650-723-4000', coords: [-122.1744, 37.4354] },
  { name: 'Pune Sahyadri Hospitals', address: 'Deccan Gymkhana, Pune, Maharashtra 411004', contact: '+91-20-67213000', coords: [73.8388, 18.5196] },
  { name: 'Kolkata Apollo Gleneagles', address: 'Canal Circular Road, Kolkata, West Bengal 700054', contact: '+91-33-23208000', coords: [88.3923, 22.5673] },
];

const SPECIALISTS = ['Cardiologist','Neurologist','Oncologist','Orthopedic','Pediatrician','Pulmonologist','Nephrologist','Gastroenterologist','Ophthalmologist','Dermatologist','Psychiatrist','Surgeon','Radiologist','Endocrinologist','Urologist'];
const FIRST_NAMES = ['Arjun','Priya','Rahul','Sunita','Amit','Kavitha','Rajesh','Deepa','Vikram','Ananya','Sanjay','Meera','Karthik','Lakshmi','Aditya','Pooja','Rohit','Nisha','Suresh','Divya','James','Sarah','Michael','Emily','David','Jessica','Robert','Ashley','William','Amanda'];
const LAST_NAMES  = ['Sharma','Patel','Gupta','Singh','Kumar','Nair','Reddy','Shah','Joshi','Rao','Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor'];

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

const DISEASES = [
  { name: 'Dengue Fever',    category: 'Vector-Borne' },
  { name: 'Malaria',         category: 'Vector-Borne' },
  { name: 'Chikungunya',     category: 'Vector-Borne' },
  { name: 'COVID-19',        category: 'Respiratory'  },
  { name: 'Pneumonia',       category: 'Respiratory'  },
  { name: 'Seasonal Flu',    category: 'Respiratory'  },
  { name: 'Tuberculosis',    category: 'Respiratory'  },
  { name: 'Typhoid',         category: 'Gastrointestinal' },
  { name: 'Cholera',         category: 'Gastrointestinal' },
  { name: 'Hepatitis A',     category: 'Gastrointestinal' },
  { name: 'Hepatitis B',     category: 'Gastrointestinal' },
  { name: 'Acute Myocardial Infarction', category: 'Cardiovascular' },
  { name: 'Hypertensive Crisis',         category: 'Cardiovascular' },
  { name: 'Stroke (Ischemic)',           category: 'Neurological' },
  { name: 'Meningitis',                  category: 'Neurological' },
  { name: 'Rabies',         category: 'Other' },
  { name: 'Leptospirosis',  category: 'Other' },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret !== 'medicity_seed_2026') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // ── Wipe existing data ───────────────────────────────────────────────────
    await Tenant.deleteMany({});
    await EpidemiologyRecord.deleteMany({});

    // Keep super_admin, delete hospital_admins and general_users
    await User.deleteMany({ role: { $in: ['hospital_admin', 'general_user'] } });

    // ── 1. Create 20 Hospitals ───────────────────────────────────────────────
    const tenantDocs: any[] = [];
    for (const hosp of HOSPITALS) {
      const icuTotal      = rnd(20, 120);
      const generalTotal  = rnd(80, 500);
      const pediatricTotal= rnd(15, 80);
      const icuOcc        = rnd(Math.floor(icuTotal * 0.4), Math.floor(icuTotal * 0.98));
      const generalOcc    = rnd(Math.floor(generalTotal * 0.3), Math.floor(generalTotal * 0.95));
      const pediatricOcc  = rnd(Math.floor(pediatricTotal * 0.2), Math.floor(pediatricTotal * 0.9));

      const statuses: ('Operational'|'Maintenance'|'Offline')[] = ['Operational','Operational','Operational','Maintenance','Offline'];
      const doc = await new Tenant({
        name: hosp.name,
        address: hosp.address,
        contact: hosp.contact,
        isVerified: true,
        location: { type: 'Point', coordinates: hosp.coords },
        bedTelemetry: {
          icu:       { total: icuTotal,       occupied: icuOcc },
          general:   { total: generalTotal,   occupied: generalOcc },
          pediatric: { total: pediatricTotal, occupied: pediatricOcc },
        },
        machinery: {
          mri:        { status: pick(statuses), count: rnd(1, 4) },
          ctScanner:  { status: pick(statuses), count: rnd(1, 5) },
          dialysis:   { status: pick(statuses), count: rnd(4, 20) },
          ecmo:       { status: pick(statuses), count: rnd(1, 6) },
          ventilators:{ total: rnd(10, 60), available: rnd(2, 20) },
        },
        currentERWaitTimeMinutes: rnd(5, 180),
        lastUpdated: daysAgo(rnd(0, 2)),
      }).save();
      tenantDocs.push(doc);
    }

    // ── 2. Create Hospital Admin accounts (one per hospital) ─────────────────
    const salt = await bcrypt.genSalt(10);
    for (let i = 0; i < tenantDocs.length; i++) {
      const fn = pick(FIRST_NAMES); const ln = pick(LAST_NAMES);
      await new User({
        email: `admin.${tenantDocs[i].name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}@medicity.com`,
        passwordHash: await bcrypt.hash('Hospital@123', salt),
        firstName: fn, lastName: ln,
        role: 'hospital_admin',
        tenantId: tenantDocs[i]._id,
      }).save();
    }

    // ── 3. Create 10 General Users ──────────────────────────────────────────
    for (let i = 0; i < 10; i++) {
      const fn = pick(FIRST_NAMES); const ln = pick(LAST_NAMES);
      await new User({
        email: `user${i + 1}@medicity.com`,
        passwordHash: await bcrypt.hash('User@123', salt),
        firstName: fn, lastName: ln,
        role: 'general_user',
      }).save();
    }

    // ── 4. Flood Epidemiology — 200 records across 60 days ──────────────────
    const epiDocs = [];
    for (let i = 0; i < 200; i++) {
      const tenant   = pick(tenantDocs);
      const disease  = pick(DISEASES);
      const cases    = rnd(1, 120);
      const mild     = rnd(0, Math.floor(cases * 0.5));
      const moderate = rnd(0, Math.floor((cases - mild) * 0.6));
      const severe   = rnd(0, Math.floor((cases - mild - moderate) * 0.7));
      const critical = Math.max(0, cases - mild - moderate - severe);
      const children = rnd(0, Math.floor(cases * 0.3));
      const adults   = rnd(0, Math.floor((cases - children) * 0.7));
      const elderly  = Math.max(0, cases - children - adults);

      epiDocs.push({
        tenantId: tenant._id,
        tenantName: tenant.name,
        diseaseName: disease.name,
        category: disease.category,
        caseCount: cases,
        severityBreakdown: { mild, moderate, severe, critical },
        ageGroupBreakdown: { children, adults, elderly },
        reportPeriod: pick(['daily', 'weekly', 'monthly']),
        reportDate: daysAgo(rnd(0, 60)),
        location: tenant.location,
        notes: pick([
          'Cluster observed near water body.',
          'Seasonal uptick expected.',
          'Community screening initiated.',
          'Contact tracing underway.',
          'Vaccination drive ongoing.',
          'Post-flood outbreak risk.',
          'School cluster identified.',
          '',
        ]),
      });
    }
    await EpidemiologyRecord.insertMany(epiDocs);

    // ── Summary ──────────────────────────────────────────────────────────────
    const adminEmails = tenantDocs.map((t, i) => ({
      hospital: t.name,
      email: `admin.${t.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}@medicity.com`,
      password: 'Hospital@123',
    }));

    return NextResponse.json({
      success: true,
      summary: {
        hospitals: tenantDocs.length,
        hospitalAdmins: tenantDocs.length,
        generalUsers: 10,
        epidemiologyRecords: epiDocs.length,
      },
      credentials: {
        superAdmin: { email: 'admin@medicity.com', password: 'Admin@123' },
        hospitalAdmins: adminEmails.slice(0, 5),
        generalUser: { email: 'user1@medicity.com', password: 'User@123' },
        note: 'All hospital admin emails follow: admin.[hospitalnameshort]@medicity.com / Hospital@123',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
