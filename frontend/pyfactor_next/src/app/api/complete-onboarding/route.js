import { NextResponse } from 'next/server';
import { saveUserOnboarding } from '@/backend/services/userService';

export async function POST(req) {
  try {
    const data = await req.json();
    await saveUserOnboarding(data); // Assuming this function saves onboarding data
    return NextResponse.json({ message: "Onboarding completed successfully" });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.error();
  }
}
