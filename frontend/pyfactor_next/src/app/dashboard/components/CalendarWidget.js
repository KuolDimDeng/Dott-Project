'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

function CalendarWidget({ onNavigate }) {
  const { t } = useTranslation('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const handleCalendarClick = () => {
    if (onNavigate) {
      onNavigate('calendar');
    }
  };
  
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === today.getDate() && 
        currentDate.getMonth() === today.getMonth() && 
        currentDate.getFullYear() === today.getFullYear();
      
      days.push(
        <div
          key={day}
          className={`h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors
            ${isToday 
              ? 'bg-blue-600 text-white font-semibold' 
              : 'hover:bg-gray-100 text-gray-700'
            }`}
          onClick={handleCalendarClick}
        >
          {day}
        </div>
      );
    }
    
    return days;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Calendar
          </h2>
          <button
            onClick={handleCalendarClick}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            View Full Calendar
            <CalendarIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Today's Events</h4>
            <button
              onClick={handleCalendarClick}
              className="text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.slice(0, 3).map((event, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={handleCalendarClick}
                >
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-500">{event.time}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No events scheduled</p>
              <button
                onClick={handleCalendarClick}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add an event
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarWidget;