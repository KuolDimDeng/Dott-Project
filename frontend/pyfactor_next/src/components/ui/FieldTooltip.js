import React from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const FieldTooltip = ({ content, position = 'right' }) => {
  return (
    <div className="relative inline-flex items-center group">
      <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help ml-1" />
      <div className={`absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded p-2 whitespace-nowrap
        ${position === 'right' ? 'left-6 top-1/2 -translate-y-1/2' : ''}
        ${position === 'top' ? 'bottom-6 left-1/2 -translate-x-1/2' : ''}
        ${position === 'bottom' ? 'top-6 left-1/2 -translate-x-1/2' : ''}
        ${position === 'left' ? 'right-6 top-1/2 -translate-y-1/2' : ''}
      `}>
        {content}
        <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45
          ${position === 'right' ? '-left-1 top-1/2 -translate-y-1/2' : ''}
          ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'left' ? '-right-1 top-1/2 -translate-y-1/2' : ''}
        `}></div>
      </div>
    </div>
  );
};

export { FieldTooltip };
export default FieldTooltip;