import React from 'react';

export default function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="animate-pulse">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[...Array(columns)].map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                {[...Array(columns)].map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}