import React, { useEffect, useState, useMemo } from "react";

const THEME = {
  bg: "#F1F5F9",
  card: "#FFFFFF",
  textMain: "#1E293B",
  textMuted: "#64748B",
  border: "#E2E8F0",
  weekend: "#F8FAFC",
  offText: "#CBD5E1",
  shifts: {
    MORNING_8_5: { bg: "#DCFCE7", text: "#166534", label: "8a–5p" },
    MORNING_11_8: { bg: "#DBEAFE", text: "#1E40AF", label: "11a–8p" },
    EVENING_4_1: { bg: "#FEF3C7", text: "#92400E", label: "4p–1a" },
    NIGHT_11_8: { bg: "#FEE2E2", text: "#991B1B", label: "Night" },
  }
};

function Roster() {
  // Use a Date object to track current view (Starting April 2026)
  const [viewDate, setViewDate] = useState(new Date(2026, 3, 1)); 
  const [loading, setLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState([]);
  const [userMatrix, setUserMatrix] = useState({});

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1; // 1-indexed for API

  useEffect(() => {
    setLoading(true);
    // Fetch happens whenever viewDate changes
    fetch(`http://localhost:3000/roster/team123/${year}/${month}`)
      .then(res => res.json())
      .then(data => {
        buildCalendar(data, year, month);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [viewDate]); // Trigger on date change

  function buildCalendar(data, currentYear, currentMonth) {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days = [];
    const matrix = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth - 1, d);
      const isWeekend = [0, 6].includes(date.getDay());
      days.push({ 
        day: d, 
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
        isWeekend 
      });

      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      let block = dayName === "Saturday" ? data.Saturday : dayName === "Sunday" ? data.Sunday : data["MON-FRI"];

      if (block) {
        Object.entries(block).forEach(([shift, users]) => {
          users.forEach(user => {
            if (!matrix[user]) matrix[user] = {};
            matrix[user][d] = shift;
          });
        });
      }
    }

    // Weekend "Off" logic
    Object.keys(matrix).forEach(user => {
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentYear, currentMonth - 1, d);
        const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
        if ((dayName === "Saturday" || dayName === "Sunday") && matrix[user][d]) {
          delete matrix[user][d-1]; 
          delete matrix[user][d+1];
        }
      }
    });

    setCalendarDays(days);
    setUserMatrix(matrix);
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + direction);
    setViewDate(newDate);
  };

  const users = useMemo(() => Object.keys(userMatrix).sort(), [userMatrix]);
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.navGroup}>
            <div>
              <h2 style={styles.title}>Team Shift Roster</h2>
              <p style={styles.subtitle}>Engineering Team 123</p>
            </div>
            
            {/* Navigation Controls */}
            <div style={styles.controls}>
              <button onClick={() => navigateMonth(-1)} style={styles.navBtn}>←</button>
              <div style={styles.currentMonthDisplay}>
                <span style={{fontWeight: 700}}>{monthName}</span> {year}
              </div>
              <button onClick={() => navigateMonth(1)} style={styles.navBtn}>→</button>
            </div>
          </div>
          
          <div style={styles.legend}>
            {Object.entries(THEME.shifts).map(([key, cfg]) => (
              <div key={key} style={styles.legendItem}>
                <span style={{...styles.dot, background: cfg.bg}}></span>
                <span style={styles.legendText}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </header>

        <div style={{...styles.tableWrapper, opacity: loading ? 0.5 : 1}}>
          {loading && <div style={styles.loaderOverlay}>Updating Roster...</div>}
          
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.stickyColHeader}>Employee</th>
                {calendarDays.map(day => (
                  <th key={day.day} style={{
                    ...styles.dateHeader,
                    background: day.isWeekend ? THEME.weekend : "white"
                  }}>
                    <div style={styles.dayName}>{day.weekday}</div>
                    <div style={styles.dayNum}>{day.day}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user} style={styles.row}>
                  <td style={styles.stickyCol}>{user}</td>
                  {calendarDays.map(day => {
                    const shift = userMatrix[user]?.[day.day];
                    const cfg = THEME.shifts[shift];
                    return (
                      <td key={day.day} style={{
                        ...styles.cell,
                        background: day.isWeekend ? THEME.weekend : "transparent"
                      }}>
                        {shift ? (
                          <span style={{...styles.badge, background: cfg.bg, color: cfg.text}}>
                            {cfg.label}
                          </span>
                        ) : (
                          <span style={styles.off}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px 20px", background: THEME.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  card: { background: THEME.card, borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", overflow: "hidden", maxWidth: "1500px", margin: "0 auto" },
  header: { padding: "24px", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px" },
  navGroup: { display: "flex", alignItems: "center", gap: "40px" },
  controls: { display: "flex", alignItems: "center", background: "#F8FAFC", padding: "4px", borderRadius: "10px", border: `1px solid ${THEME.border}` },
  navBtn: { background: "white", border: `1px solid ${THEME.border}`, borderRadius: "6px", width: "32px", height: "32px", cursor: "pointer", fontWeight: "bold", color: THEME.textMain, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  currentMonthDisplay: { padding: "0 16px", minWidth: "140px", textAlign: "center", fontSize: "14px", color: THEME.textMain },
  title: { margin: 0, fontSize: "20px", fontWeight: "700", color: THEME.textMain },
  subtitle: { margin: "2px 0 0", fontSize: "13px", color: THEME.textMuted },
  legend: { display: "flex", gap: "12px" },
  legendItem: { display: "flex", alignItems: "center", gap: "6px" },
  dot: { width: "10px", height: "10px", borderRadius: "50%" },
  legendText: { fontSize: "11px", fontWeight: "500", color: THEME.textMuted },
  tableWrapper: { overflowX: "auto", position: "relative", minHeight: "400px" },
  loaderOverlay: { position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.8)", padding: "12px 24px", borderRadius: "20px", border: `1px solid ${THEME.border}`, zIndex: 100, fontWeight: "600", color: THEME.textMuted },
  table: { borderCollapse: "collapse", width: "100%", fontSize: "12px" },
  stickyColHeader: { position: "sticky", left: 0, background: "white", zIndex: 10, padding: "16px 24px", textAlign: "left", borderBottom: `2px solid ${THEME.border}`, fontWeight: "600", minWidth: "150px" },
  dateHeader: { padding: "10px 4px", textAlign: "center", minWidth: "40px", borderBottom: `2px solid ${THEME.border}` },
  dayName: { fontSize: "9px", textTransform: "uppercase", color: THEME.textMuted },
  dayNum: { fontSize: "14px", fontWeight: "600" },
  row: { borderBottom: `1px solid ${THEME.border}` },
  stickyCol: { position: "sticky", left: 0, background: "white", zIndex: 5, padding: "12px 24px", fontWeight: "600", color: THEME.textMain, boxShadow: "4px 0 8px -4px rgba(0,0,0,0.05)" },
  cell: { padding: "8px 2px", textAlign: "center" },
  badge: { padding: "4px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", whiteSpace: "nowrap" },
  off: { color: THEME.offText }
};

export default Roster;