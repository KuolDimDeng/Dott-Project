'use client';

export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== 'staging') {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-black text-center py-2 text-sm font-medium">
      ⚠️ STAGING ENVIRONMENT - Test Data Only
    </div>
  );
}
