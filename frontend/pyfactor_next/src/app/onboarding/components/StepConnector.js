'use client';

export default function StepConnector({ active, completed }) {
  // Base classes for the connector line
  const baseClasses = "absolute top-[24px] left-[calc(50%+16px)] right-[calc(50%+16px)] h-1 -translate-y-1/2 rounded";
  
  // Conditional background color based on state
  const bgColor = completed
    ? "bg-gradient-to-r from-green-400 to-green-600"
    : active
      ? "bg-gradient-to-r from-primary-light to-primary-dark"
      : "bg-gray-200";
  
  return (
    <div className="relative w-full h-full">
      <div className={`${baseClasses} ${bgColor}`}></div>
    </div>
  );
}