import React from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
} from 'lucide-react';

const DEFAULT_SHIFT_COLORS = {
  morning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  evening: 'bg-orange-100 text-orange-800 border-orange-200',
  night: 'bg-purple-100 text-purple-800 border-purple-200',
  OFF: 'bg-gray-100 text-gray-500 border-gray-200',
};

const getShiftIcon = (shiftId) => {
  const icons = {
    morning: '🌅',
    evening: '🌇',
    night: '🌙',
    off: '❌',
  };

  return icons[(shiftId || '').toLowerCase()] || '🕒';
};



const getShiftColorClasses = (shiftId, shiftConfig) => {
  const shift = shiftConfig?.shifts?.find((item) => item.id === shiftId);
  if (shift?.color) {
    return {
      style: { backgroundColor: shift.color, color: '#ffffff' },
      className: 'border border-transparent',
    };
  }

  const normalizedShiftId = (shiftId || '').toLowerCase();
  const className = DEFAULT_SHIFT_COLORS[normalizedShiftId] || DEFAULT_SHIFT_COLORS[shiftId] || 'bg-blue-100 text-blue-800 border-blue-200';
  return { className, style: {} };
};



const getShiftDisplayName = (shiftId, shiftConfig) => {
  const shift = shiftConfig?.shifts?.find((item) => item.id === shiftId);
  return shift?.name || shiftId || 'OFF';
};

const getShiftTimings = (shiftId, shiftConfig) => {
  const shift = shiftConfig?.shifts?.find((item) => item.id === shiftId);
  if (shift) {
    return `${shift.startTime} - ${shift.endTime}`;
  }
  return '';
};

const getDayOfWeek = (date) => {
  return new Date(date).toLocaleString("default", {
    weekday: "short"
  });
};

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

const RosterCalendar = ({
  layout = 'member',
  title,
  subtitle,
  selectedYear,
  selectedMonth,
  days,
  schedule,
  rows,
  shiftConfig,
  summaryText,
  summaryCards = [],
  onPreviousMonth,
  onNextMonth,
  onDownload,
  onCellContextMenu,
  renderCellExtra,
  showDownloadButton = false,
  showNavigation = false,
  showSummaryCards = false,
  showLegend = true,
  legendItems = [],
  emptyState,
  memberNameLabel = 'Team Member',
  className = '',
}) => {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const leadDays = Array.from(
    { length: new Date(selectedYear, selectedMonth - 1, 1).getDay() === 0 ? 6 : new Date(selectedYear, selectedMonth - 1, 1).getDay() - 1 },
    (_, index) => index,
  );

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {title || `${monthNames[selectedMonth - 1]} ${selectedYear} Roster`}
            </h3>
            {subtitle && <p className="text-blue-100 text-sm mt-1">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showNavigation && (
              <>
                <button
                  onClick={onPreviousMonth}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={onNextMonth}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            {showDownloadButton && (
              <button
                onClick={onDownload}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
          </div>
        </div>

        {summaryText && (
          <p className="text-blue-100 text-sm mt-3">{summaryText}</p>
        )}
      </div>

      {showSummaryCards && summaryCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b">
          {summaryCards.map((card) => (
            <div key={card.label} className={`text-center p-3 rounded-lg ${card.className}`}>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-gray-600">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {layout === 'member' ? (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {leadDays.map((item) => (
              <div key={`empty-${item}`} className="h-24 bg-gray-50 rounded-lg" />
            ))}

            {days.map((dayObj) => {
              const { key, day, month, year } = dayObj;
              const weekday = getDayOfWeek(dayObj.date);

              const weekendDay = isWeekend(dayObj.date);
              const shiftId = schedule?.[key] || 'OFF';
              const shiftIcon = getShiftIcon(shiftId);
              const shiftName = getShiftDisplayName(shiftId, shiftConfig);
              const shiftColor = getShiftColorClasses(shiftId, shiftConfig);
              
              const timings = shiftId !== 'OFF' ? getShiftTimings(shiftId, shiftConfig) : '';
              const weekend = isWeekend(dayObj.date);

              return (
                <div
                  key={dayObj.key}
                  className={`h-24 border rounded-lg p-2 ${weekend ? 'bg-red-50' : 'bg-white'} hover:shadow-md transition`}
                >
                  <div className="font-bold text-gray-700 text-sm">{dayObj.day}</div>
                  {shiftId !== 'OFF' ? (
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${shiftColor.className}`}
                        style={shiftColor.style}
                      >
                        <span>{shiftIcon}</span>
                        {shiftName}
                      </span>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timings}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400 text-center">OFF</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-100 border-b">
                <th className="sticky left-0 bg-gray-100 z-30 px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r w-48">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {memberNameLabel}
                  </div>
                </th>
                {days.map((dayObj) => {
  const weekday = getDayOfWeek(dayObj.date);
  const weekendDay = isWeekend(dayObj.date);

  return (
    <th
      key={dayObj.key}
      className={`px-2 py-3 text-center text-sm font-medium ${
        weekendDay ? "bg-red-100" : "bg-gray-100"
      } min-w-[55px] border-b`}
    >
      <div className="text-gray-700 font-bold">
        {dayObj.day}
      </div>

      <div className="text-[10px] text-gray-500">
        {dayObj.date.toLocaleDateString("default", {
          month: "short"
        })}
      </div>

      <div
        className={`text-xs ${
          weekendDay ? "text-red-600" : "text-gray-500"
        }`}
      >
        {weekday}
      </div>
    </th>
  );
})}
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.memberId || row.id} className="border-b hover:bg-gray-50 transition">
                  <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-gray-800 border-r whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${row.isWeekendWorker ? 'bg-green-500' : 'bg-blue-500'}`} />
                      {row.memberName || row.label}
                    </div>
                  </td>
                  {days.map((dayObj) => {
                    const shift = row.schedule?.[dayObj.key] || 'OFF';
                    const shiftColor = getShiftColorClasses(shift, shiftConfig);
                    
                    const weekendDay = isWeekend(dayObj.date);
                    return (
                      <td
                        key={dayObj.key}
                        className={`px-2 py-2 text-center ${weekendDay ? 'bg-red-50/30' : ''} cursor-pointer hover:bg-gray-100 transition`}
                        onContextMenu={(event) => onCellContextMenu?.(event, row, dayObj)}
                      >
                        <span
                          className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full ${shiftColor.className} border min-w-[60px]`}
                          style={shiftColor.style}
                        >
                          
                          {shift !== 'OFF' ? shift.charAt(0).toUpperCase() + shift.slice(1) : ''}
                        </span>
                        {renderCellExtra?.(row, dayObj)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLegend && (
        <div className="p-4 border-t bg-gray-50">
          {layout === 'member' ? (
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-semibold text-gray-700">Legend:</span>
              {shiftConfig?.shifts?.map((shift) => (
                <div key={shift.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                  <span className="text-sm text-gray-600">{shift.name}</span>
                  <span className="text-xs text-gray-400">({shift.startTime}-{shift.endTime})</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-600">Day Off</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 items-center">
              <span className="text-sm font-semibold text-gray-700">Legend:</span>
              {shiftConfig?.shifts?.map((shift) => (
                <div key={shift.id} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: shift.color }} />
                  <span className="text-sm text-gray-700 font-medium">{shift.name}</span>
                  <span className="text-xs text-gray-500">({shift.startTime} - {shift.endTime})</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
                <span className="text-sm text-gray-600">Day Off</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                <span className="text-sm text-gray-600">Weekend Day</span>
              </div>
              {legendItems.map((legend) => (
                <div key={legend.label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${legend.className}`} />
                  <span className="text-sm text-gray-600">{legend.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!rows?.length && !schedule && emptyState && (
        <div className="p-6 text-center text-gray-500">{emptyState}</div>
      )}
    </div>
  );
};

export default RosterCalendar;
