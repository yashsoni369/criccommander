import { NextResponse } from 'next/server';
import { updateAndGetViewers } from '@/lib/redis';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    if (!clientId) {
      return NextResponse.json({ viewers: 0 }, { status: 400 });
    }
    
    const count = await updateAndGetViewers(clientId);
    return NextResponse.json({ viewers: count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ viewers: 0 }, { status: 500 });
  }
}
