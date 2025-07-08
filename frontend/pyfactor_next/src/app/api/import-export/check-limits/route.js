import { NextResponse } from 'next/server';
import { getSession } from '../sessionHelper';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';

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
  // Check subscription plan from user data
  const plan = user.subscription_plan || user.subscriptionPlan || 'free';
  // Convert to uppercase for consistency
  return plan.toUpperCase();
}

function getUserImportKey(userId) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  return `import_usage_${userId}_${monthKey}`;
}

export async function GET(request) {
  return await Sentry.startSpan(
    { name: 'GET /api/import-export/check-limits', op: 'http.server' },
    async () => {
      try {
        const session = await getSession();
        if (!session?.user) {
          logger.warn('Unauthorized access attempt to check-limits');
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }

        const userPlan = getUserPlan(session.user);
        const limits = IMPORT_LIMITS[userPlan] || IMPORT_LIMITS.FREE;
        const usageKey = getUserImportKey(session.user.id);
        
        // Track user plan in Sentry
        Sentry.setTag('user.plan', userPlan);
        
        // Get current usage (in production, fetch from Redis/DB)
        const fetchUsageSpan = Sentry.startInactiveSpan({ name: 'fetch-import-usage' });
        const currentUsage = importUsageCache.get(usageKey) || {
          importsUsed: 0,
          aiAnalysisUsed: 0,
          lastImportDate: null
        };
        fetchUsageSpan.end();
        
        logger.info('Import limits checked', { 
          userId: session.user.id,
          plan: userPlan,
          usage: currentUsage
        });

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
        logger.error('Check limits error', error);
        Sentry.captureException(error, {
          tags: { endpoint: 'import-export-check-limits' },
          user: { id: session?.user?.id }
        });
        return NextResponse.json(
          { error: 'Failed to check limits' },
          { status: 500 }
        );
      }
    }
  );
}

// Increment usage when import is performed
export async function POST(request) {
  try {
    const session = await getSession();
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