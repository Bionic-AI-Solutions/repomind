import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json(
        { status: "ready", timestamp: new Date().toISOString() },
        { status: 200 }
    );
}



