import { NextResponse } from 'next/server';
import { saveUserOnboarding } from '@/backend/services/userService';

export async function POST(req) {
    try {
      const data = await req.json();
      console.log("Onboarding completion request received:", data);
  
      await saveUserOnboarding(data);
      console.log("Onboarding data saved successfully");
  
      return NextResponse.json({ message: "Onboarding completed successfully" });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      return NextResponse.error();
    }
  }