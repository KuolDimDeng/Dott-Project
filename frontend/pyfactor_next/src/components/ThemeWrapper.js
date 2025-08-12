'use client';

export default function ThemeWrapper({ children }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {children}
    </div>
  );
}
