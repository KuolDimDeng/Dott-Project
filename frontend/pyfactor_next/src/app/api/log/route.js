import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.json();
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...body
  }) + '\n';

  const filePath = path.join(process.cwd(), 'error_logs.txt');

  try {
    fs.appendFileSync(filePath, logEntry);
    console.log('Log entry written to:', filePath);
    return NextResponse.json({ message: 'Error logged successfully' });
  } catch (err) {
    console.error('Failed to write to log file', err);
    return NextResponse.json({ message: 'Failed to log error' }, { status: 500 });
  }
}