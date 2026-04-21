import { NextResponse } from 'next/server';
import { Tenant } from '@/models/Tenant';
import connectToDatabase from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    // In production, verify the user's JWT and ensure their role is 'hospital_admin' 
    // and that body.tenantId matches their authorized tenant.
    const { tenantId, telemetryUpdates } = body;

    if (!tenantId || !telemetryUpdates) {
      return NextResponse.json({ success: false, error: 'Missing tenantId or telemetryUpdates' }, { status: 400 });
    }

    // Construct dynamic update object (so we only update fields passed)
    const updateQuery: any = { lastUpdated: new Date() };
    
    // e.g., telemetryUpdates: { "bedTelemetry.icu.occupied": 42 }
    for (const [key, value] of Object.entries(telemetryUpdates)) {
      updateQuery[key] = value;
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateQuery },
      { new: true, runValidators: true }
    );

    if (!updatedTenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Inter-Hospital Load Balancing Trigger (Simulated background event)
    if (updatedTenant.bedTelemetry.icu.total > 0) {
      const icuRatio = updatedTenant.bedTelemetry.icu.occupied / updatedTenant.bedTelemetry.icu.total;
      if (icuRatio >= 0.95) {
        // Trigger background job (e.g., via Kafka, RabbitMQ, or simply async Node process) 
        // to alert neighboring hospitals of overflow.
        console.warn(`[Load Balancing] CRITICAL ALERT: ${updatedTenant.name} ICU is at ${(icuRatio*100).toFixed(1)}% capacity. Overflow routing activated.`);
      }
    }

    return NextResponse.json({ success: true, data: updatedTenant });
  } catch (error: any) {
    console.error('Telemetry API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
