import React from 'react';
import { SearchIcon } from '@/app/components/icons';

const SearchComponent = () => {
  return (
    <div className="relative rounded-md bg-white dark:bg-gray-700 mx-3 md:w-80">
      <div className="absolute inset-y-0 left-0 flex items-center justify-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
        <SearchIcon className="h-5 w-5" />
      </div>
      <input
        className="block w-full pl-10 pr-3 py-2 text-gray-900 dark:text-white bg-transparent border-none rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all"
        placeholder="Search…"
        aria-label="search"
      />
    </div>
  );
};

export default SearchComponent;