import * as React from 'react';
import Title from './Title';

function preventDefault(event) {
  event.preventDefault();
}

export default function Deposits() {
  return (
    <div>
      <Title>Recent Deposits</Title>
      <p className="text-3xl font-bold">
        $3,024.00
      </p>
      <p className="text-gray-500 flex-1">
        on 15 March, 2019
      </p>
      <div className="mt-4">
        <a 
          href="#" 
          onClick={preventDefault}
          className="text-indigo-600 hover:text-indigo-900"
        >
          View balance
        </a>
      </div>
    </div>
  );
}
