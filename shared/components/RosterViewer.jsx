// shared/components/RosterViewer.jsx

import React, { useMemo } from "react";
import RosterCalendar from "./RosterCalendar";

const RosterViewer = ({
  roster,
  rows = [],
  shiftConfig,
  title,
  onDownload,
  onCellContextMenu,
  renderCellExtra,
  showDownloadButton = false,
  showSummaryCards = true,
  showLegend = true,
  className = "",
}) => {
  /*
   * Normalize the API response.
   *
   * Supports:
   *
   * Preview:
   * {
   *   success: true,
   *   roster: { date: assignments },
   *   rosterStartDate,
   *   rosterEndDate
   * }
   *
   * Load Existing:
   * {
   *   success: true,
   *   roster: {
   *     roster: { date: assignments },
   *     rosterStartDate,
   *     rosterEndDate
   *   }
   * }
   */
  const rosterDocument = useMemo(() => {
  if (!roster) {
    return null;
  }

  console.log("RosterViewer received:", roster);

  // ============================================
  // CASE 1: LOAD EXISTING RESPONSE
  //
  // {
  //   success: true,
  //   roster: {
  //     roster: { "2026-06-29": [...] },
  //     rosterStartDate: "2026-06-29",
  //     rosterEndDate: "2026-07-26"
  //   }
  // }
  // ============================================
  if (
    roster.roster &&
    roster.roster.roster &&
    typeof roster.roster.roster === "object"
  ) {
    console.log("RosterViewer format: LOAD EXISTING");

    return roster.roster;
  }

  // ============================================
  // CASE 2: PREVIEW RESPONSE
  //
  // {
  //   success: true,
  //   type: "PREVIEW",
  //   roster: {
  //     "2026-06-30": [...],
  //     "2026-07-01": [...]
  //   }
  // }
  // ============================================
  if (
    roster.roster &&
    typeof roster.roster === "object"
  ) {
    console.log("RosterViewer format: PREVIEW");

    const dateKeys = Object.keys(roster.roster)
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .sort();

    return {
      ...roster,

      rosterStartDate:
        roster.rosterStartDate ||
        dateKeys[0] ||
        null,

      rosterEndDate:
        roster.rosterEndDate ||
        dateKeys[dateKeys.length - 1] ||
        null
    };
  }

  console.warn(
    "RosterViewer: Could not determine roster format",
    roster
  );

  return null;
}, [roster]);
  const days = useMemo(() => {
    if (!rosterDocument) {
      return [];
    }

    const startDate = rosterDocument.rosterStartDate;
    const endDate = rosterDocument.rosterEndDate;

    if (!startDate || !endDate) {
      console.warn(
        "RosterViewer: Missing rosterStartDate or rosterEndDate",
        {
          startDate,
          endDate,
          rosterDocument,
        }
      );

      return [];
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      console.error(
        "RosterViewer: Invalid roster dates",
        {
          startDate,
          endDate,
        }
      );

      return [];
    }

    const generatedDays = [];
    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(
        current.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        current.getDate()
      ).padStart(2, "0");

      const key = `${year}-${month}-${day}`;

      generatedDays.push({
        key,
        day: current.getDate(),
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        date: new Date(current),
      });

      current.setDate(current.getDate() + 1);
    }

    return generatedDays;
  }, [rosterDocument]);

  /*
   * If rows weren't supplied, build them directly
   * from the actual roster assignment map.
   */
  const displayRows = useMemo(() => {
    if (rows.length > 0) {
      return rows;
    }

    if (!rosterDocument) {
      return [];
    }

    const rosterMap = rosterDocument.roster || {};

    const dateKeys = Object.keys(rosterMap).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    const memberMap = new Map();

    dateKeys.forEach((dateKey) => {
      const assignments = rosterMap[dateKey] || [];

      assignments.forEach((assignment) => {
        if (!memberMap.has(assignment.userId)) {
          memberMap.set(assignment.userId, {
            memberId: assignment.userId,
            memberName:
              assignment.name || "Unknown Member",
            isWeekendWorker:
              assignment.isWeekendWorker || false,
            schedule: {},
            shiftDetails: {},
            shiftCounts: {},
          });
        }

        const member = memberMap.get(
          assignment.userId
        );

        member.schedule[dateKey] =
          assignment.shift || "OFF";

        member.shiftDetails[dateKey] =
          assignment;
      });
    });

    const generatedRows = Array.from(
      memberMap.values()
    );

    /*
     * Make sure every member has an assignment
     * for every displayed day.
     */
    generatedRows.forEach((member) => {
      days.forEach((dayObj) => {
        if (!member.schedule[dayObj.key]) {
          member.schedule[dayObj.key] = "OFF";
        }
      });

      Object.values(member.schedule).forEach(
        (shift) => {
          if (shift !== "OFF") {
            member.shiftCounts[shift] =
              (member.shiftCounts[shift] || 0) + 1;
          }
        }
      );
    });

    generatedRows.sort((a, b) =>
      a.memberName.localeCompare(b.memberName)
    );

    return generatedRows;
  }, [rosterDocument, rows, days]);

  const summaryCards = useMemo(() => {
    const summary = rosterDocument?.summary || {};

    return [
      {
        label: "Members",
        value:
          summary.totalUsers ||
          displayRows.length ||
          0,
        className: "bg-blue-50",
      },
      {
        label: "Shifts",
        value: summary.totalShifts || 0,
        className: "bg-green-50",
      },
      {
        label: "Avg Days",
        value:
          summary.averageDaysPerUser || 0,
        className: "bg-yellow-50",
      },
      {
        label: "Published",
        value: rosterDocument?.published
          ? "Yes"
          : "No",
        className: "bg-purple-50",
      },
    ];
  }, [rosterDocument, displayRows]);

  if (!rosterDocument) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
        No roster available.
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center">
        <p className="font-semibold text-gray-700">
          Unable to display roster.
        </p>

        <p className="text-sm text-gray-500 mt-2">
          The saved roster does not contain a valid start
          and end date.
        </p>
      </div>
    );
  }

  const displayTitle =
    title ||
    `${new Date(
      `${rosterDocument.rosterStartDate}T00:00:00`
    ).toLocaleDateString("default", {
      month: "long",
      year: "numeric",
    })} Roster`;

  const formatDate = (dateString) => {
    return new Date(
      `${dateString}T00:00:00`
    ).toLocaleDateString("default", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const subtitle = `Roster Period: ${formatDate(
    rosterDocument.rosterStartDate
  )} – ${formatDate(
    rosterDocument.rosterEndDate
  )}`;

  return (
    <RosterCalendar
      layout="team"
      className={className}
      title={displayTitle}
      subtitle={subtitle}
      selectedYear={
        rosterDocument.metadata?.year ||
        rosterDocument.year
      }
      selectedMonth={
        rosterDocument.metadata?.month ||
        rosterDocument.month
      }
      rows={displayRows}
      days={days}
      shiftConfig={
        shiftConfig || rosterDocument.shiftConfig
      }
      summaryCards={summaryCards}
      showSummaryCards={showSummaryCards}
      showLegend={showLegend}
      showDownloadButton={showDownloadButton}
      onDownload={onDownload}
      onCellContextMenu={onCellContextMenu}
      renderCellExtra={renderCellExtra}
      memberNameLabel="Team Member"
      emptyState="No roster assignments available."
    />
  );
};

export default RosterViewer;