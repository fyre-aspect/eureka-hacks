import { NextRequest, NextResponse } from 'next/server';
import { parseSketch } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    const scene = await parseSketch(imageBase64);
    return NextResponse.json(scene);
  } catch (error) {
    console.error('Error parsing sketch:', error);
    return NextResponse.json({ error: 'Failed to parse sketch' }, { status: 500 });
  }
}
