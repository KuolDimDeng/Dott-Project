'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
    >
      Print this policy
    </button>
  );
}