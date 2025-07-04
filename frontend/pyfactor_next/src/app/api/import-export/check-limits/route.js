import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Import limits by subscription plan
const IMPORT_LIMITS = {
  FREE: {
    importsPerMonth: 3,
    aiAnalysisPerMonth: 3,
    maxRowsPerImport: 100,
    maxFileSize: 1 * 1024 * 1024, // 1MB
  },
  PROFESSIONAL: {
    importsPerMonth: 50,
    aiAnalysisPerMonth: 50,
    maxRowsPerImport: 5000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  ENTERPRISE: {
    importsPerMonth: 500,
    aiAnalysisPerMonth: 500,
    maxRowsPerImport: 50000,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  }
};

// In production, these would be stored in Redis or database
const importUsageCache = new Map();

function getUserPlan(user) {
  // This should check the actual subscription plan from your database
  // For now, return based on user metadata or default to FREE
  return user.subscriptionPlan || 'FREE';
}

function getUserImportKey(userId) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  return `import_usage_${userId}_${monthKey}`;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userPlan = getUserPlan(session.user);
    const limits = IMPORT_LIMITS[userPlan] || IMPORT_LIMITS.FREE;
    const usageKey = getUserImportKey(session.user.id);
    
    // Get current usage (in production, fetch from Redis/DB)
    const currentUsage = importUsageCache.get(usageKey) || {
      importsUsed: 0,
      aiAnalysisUsed: 0,
      lastImportDate: null
    };

    // Calculate remaining limits
    const remaining = {
      imports: limits.importsPerMonth - currentUsage.importsUsed,
      aiAnalysis: limits.aiAnalysisPerMonth - currentUsage.aiAnalysisUsed,
      canImport: currentUsage.importsUsed < limits.importsPerMonth,
      canUseAI: currentUsage.aiAnalysisUsed < limits.aiAnalysisPerMonth
    };

    return NextResponse.json({
      plan: userPlan,
      limits,
      usage: currentUsage,
      remaining,
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    });

  } catch (error) {
    console.error('Check limits error:', error);
    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    );
  }
}

// Increment usage when import is performed
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { type } = await request.json(); // 'import' or 'ai_analysis'
    const usageKey = getUserImportKey(session.user.id);
    
    // Get current usage
    const currentUsage = importUsageCache.get(usageKey) || {
      importsUsed: 0,
      aiAnalysisUsed: 0,
      lastImportDate: null
    };

    // Increment based on type
    if (type === 'import') {
      currentUsage.importsUsed += 1;
      currentUsage.lastImportDate = new Date().toISOString();
    } else if (type === 'ai_analysis') {
      currentUsage.aiAnalysisUsed += 1;
    }

    // Save updated usage (in production, save to Redis/DB)
    importUsageCache.set(usageKey, currentUsage);

    return NextResponse.json({
      success: true,
      newUsage: currentUsage
    });

  } catch (error) {
    console.error('Update usage error:', error);
    return NextResponse.json(
      { error: 'Failed to update usage' },
      { status: 500 }
    );
  }
}