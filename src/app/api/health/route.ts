import { NextResponse } from 'next/server';

/**
 * Health check endpoint used by GCP Cloud Run load balancers
 * and deployment probes to verify the application container is active.
 */
export async function GET() {
  return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() });
}
