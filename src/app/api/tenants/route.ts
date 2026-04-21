import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Tenant } from '@/models/Tenant';

export async function GET() {
  try {
    await connectToDatabase();
    const tenants = await Tenant.find({}, '_id name').lean();
    return NextResponse.json({ success: true, tenants });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
