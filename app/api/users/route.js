import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    const db = getDB();
    const { data, error } = await db.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data, data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
