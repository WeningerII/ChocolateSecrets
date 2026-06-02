import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ProductionRun } from '../types';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface ProductionCalendarProps {
  productionRuns: ProductionRun[];
  onSelectRun: (run: ProductionRun) => void;
}

export default function ProductionCalendar({ productionRuns, onSelectRun }: ProductionCalendarProps) {
  const events = productionRuns.map(run => {
    // Handle Firestore Timestamp or Date
    let date = new Date();
    if (run.plannedDate) {
      if (typeof (run.plannedDate as any).toDate === 'function') {
        date = (run.plannedDate as any).toDate();
      } else if (run.plannedDate instanceof Date) {
        date = run.plannedDate;
      } else if (typeof run.plannedDate === 'string') {
        date = new Date(run.plannedDate);
      }
    }

    return {
      id: run.id,
      title: run.name || 'Untitled Run',
      start: date,
      end: date, // Single day events for now
      allDay: true,
      resource: run,
    };
  });

  return (
    <div className="h-[600px] bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={(event) => onSelectRun(event.resource)}
        views={['month', 'week', 'day']}
        defaultView="month"
        eventPropGetter={(event) => {
          let backgroundColor = '#b45309'; // amber-700
          if (event.resource.status === 'completed') {
            backgroundColor = '#15803d'; // green-700
          } else if (event.resource.status === 'draft') {
            backgroundColor = '#78716c'; // stone-500
          }
          return { style: { backgroundColor } };
        }}
      />
    </div>
  );
}
