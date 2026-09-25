import { useMemo, useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download, FileBarChart2 } from "lucide-react";
import API from "../util/api";
import { formatDate } from "../../utils/helpers";

const REPORT_TYPES = [
  { label: "Revenue Report", value: "revenue" },
  { label: "Appointments Report", value: "appointments" },
  { label: "Status Report", value: "status" },
];

const PERIODS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const CHART_COLORS = ["#2563eb", "#0ea5e9", "#16a34a", "#f59e0b", "#dc2626", "#14b8a6", "#8b5cf6"];
const COMPLETED_STATUSES = new Set(["completed", "consultation-completed"]);

const normalizeStatus = (status) => String(status || "pending").toLowerCase();

const getCurrentDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateTime = (dateValue, timeValue) => {
  if (!dateValue) return null;

  let year;
  let month;
  let day;

  const rawDate = String(dateValue).trim();
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmyMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (dmyMatch) {
    day = Number(dmyMatch[1]);
    month = Number(dmyMatch[2]);
    year = Number(dmyMatch[3]);
  } else {
    const fallback = new Date(rawDate);
    if (Number.isNaN(fallback.getTime())) return null;
    year = fallback.getFullYear();
    month = fallback.getMonth() + 1;
    day = fallback.getDate();
  }

  let hours = 0;
  let minutes = 0;

  if (timeValue) {
    const rawTime = String(timeValue).trim().toLowerCase();
    const timeMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);

    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2]);
      const period = timeMatch[3];

      if (period) {
        if (period === "pm" && hours !== 12) hours += 12;
        if (period === "am" && hours === 12) hours = 0;
      }
    }
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getPeriodWindow = (period, { selectedDate }) => {
  const now = new Date();
  const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (Number.isNaN(base.getTime())) {
    const fallback = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start: fallback, end: fallback };
  }

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);

  const end = new Date(base);

  if (period === "daily") {
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "weekly") {
    start.setDate(start.getDate() - 7);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "monthly") {
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // yearly
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatMoney = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const statusLabel = (status) => {
  const s = normalizeStatus(status);
  if (s === "consultation-completed") return "Completed";
  if (s === "no-show") return "Rejected";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const csvCell = (value) => {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
};

const asCsvDateText = (value) => {
  const formatted = formatDate(value, "N/A");
  if (formatted === "N/A") return formatted;
  // Force text in Excel so DD/MM/YYYY does not collapse into #### when opened.
  return `'${formatted}`;
};

export default function DoctorReport() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [reportType, setReportType] = useState("revenue");
  const [period, setPeriod] = useState("monthly");
  const [selectedDate, setSelectedDate] = useState(getCurrentDateValue());
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth).padStart(2, "0"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allAppointments, setAllAppointments] = useState([]);
  const [reportRows, setReportRows] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [reportRange, setReportRange] = useState({ from: "N/A", to: "N/A" });

  const yearOptions = useMemo(() => {
    return Array.from({ length: currentYear - 2000 + 1 }, (_, index) => String(currentYear - index));
  }, [currentYear]);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        const { data } = await API.get("/appointments/doctor");
        setAllAppointments(Array.isArray(data) ? data : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load report data");
        setAllAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  useEffect(() => {
    if (period !== "monthly") return;
    if (Number(selectedYear) !== currentYear) return;
    if (Number(selectedMonth) <= currentMonth) return;
    setSelectedMonth(String(currentMonth).padStart(2, "0"));
  }, [period, selectedYear, selectedMonth, currentYear, currentMonth]);

  const selectedPeriodWindow = useMemo(() => {
    const baseDate = period === "yearly"
      ? `${selectedYear}-01-01`
      : period === "monthly"
        ? `${selectedYear}-${selectedMonth}-01`
        : selectedDate;

    return getPeriodWindow(period, { selectedDate: baseDate });
  }, [period, selectedDate, selectedYear, selectedMonth]);

  const selectedPeriodRangeLabel = useMemo(() => {
    return {
      from: formatDate(selectedPeriodWindow.start, "N/A"),
      to: formatDate(selectedPeriodWindow.end, "N/A"),
    };
  }, [selectedPeriodWindow]);

  const reportTypeLabel = useMemo(() => {
    return REPORT_TYPES.find((item) => item.value === reportType)?.label || "Report";
  }, [reportType]);

  const hasGenerated = Boolean(generatedAt);
  const isNoDataState = hasGenerated && !loading && !error && reportRows.length === 0;
  const noDataMessage = `No data found for ${reportTypeLabel} in the selected range (${reportRange.from} - ${reportRange.to}).`;

  const generateReport = () => {
    const { start, end } = selectedPeriodWindow;
    const generatedTime = new Date();
    const range = {
      from: formatDate(start, "N/A"),
      to: formatDate(end, "N/A"),
    };

    const filtered = allAppointments.filter((item) => {
      const dt = parseDateTime(item?.date, item?.time) || new Date(item?.createdAt || 0);
      if (Number.isNaN(dt.getTime())) return false;
      return dt >= start && dt <= end;
    });

    if (reportType === "appointments") {
      const rows = [...filtered]
        .sort((a, b) => {
          const aTs = (parseDateTime(a?.date, a?.time) || new Date(a?.createdAt || 0)).getTime();
          const bTs = (parseDateTime(b?.date, b?.time) || new Date(b?.createdAt || 0)).getTime();
          return bTs - aTs;
        })
        .map((item) => ({
          rawDate: item?.date || item?.createdAt || null,
          date: formatDate(item?.date || item?.createdAt, "N/A"),
          time: item?.time || "N/A",
          patientName: item?.patient?.name || "N/A",
          status: statusLabel(item?.status),
          fees: Number(item?.fees || item?.doctor?.fees || 0),
        }));

      setReportRows(rows);
      setGeneratedAt(generatedTime);
      setReportRange(range);
      return;
    }

    if (reportType === "status") {
      const map = new Map();

      filtered.forEach((item) => {
        const label = statusLabel(item?.status);
        if (!map.has(label)) {
          map.set(label, { status: label, count: 0 });
        }
        map.get(label).count += 1;
      });

      const total = filtered.length || 1;
      const rows = Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .map((entry) => ({
          dateRange: `${range.from} - ${range.to}`,
          status: entry.status,
          count: entry.count,
          percentage: Math.round((entry.count / total) * 100),
        }));

      setReportRows(rows);
      setGeneratedAt(generatedTime);
      setReportRange(range);
      return;
    }

    const byDate = new Map();
    let fallbackConsultationFee = 0;

    filtered.forEach((item) => {
      const dateKey = formatDate(item?.date || item?.createdAt, "N/A");
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {
          date: dateKey,
          totalAppointments: 0,
          completedAppointments: 0,
          estimatedRevenue: 0,
          consultationFee: 0,
        });
      }

      const row = byDate.get(dateKey);
      const fees = Number(item?.fees || item?.doctor?.fees || 0);
      const status = normalizeStatus(item?.status);

      if (!fallbackConsultationFee && fees > 0) {
        fallbackConsultationFee = fees;
      }

      if (!row.consultationFee && fees > 0) {
        row.consultationFee = fees;
      }

      row.totalAppointments += 1;
      if (COMPLETED_STATUSES.has(status)) {
        row.completedAppointments += 1;
        row.estimatedRevenue += fees;
      }
    });

    const rows = Array.from(byDate.values())
      .map((entry) => ({
        ...entry,
        avgFee: entry.completedAppointments
          ? Math.round(entry.estimatedRevenue / entry.completedAppointments)
          : (entry.consultationFee || fallbackConsultationFee || 0),
      }))
      .sort((a, b) => {
        const aDate = parseDateTime(a.date, "00:00") || new Date(0);
        const bDate = parseDateTime(b.date, "00:00") || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

    setReportRows(rows);
    setGeneratedAt(generatedTime);
    setReportRange(range);
  };

  const summaryCards = useMemo(() => {
    if (!reportRows.length) {
      return [
        { label: "Total Appointments", value: 0 },
        { label: "Completed", value: 0 },
        { label: "Cancelled", value: 0 },
      ];
    }

    if (reportType === "revenue") {
      const totalRevenue = reportRows.reduce((sum, row) => sum + Number(row.estimatedRevenue || 0), 0);
      const totalCompletedAppointments = reportRows.reduce((sum, row) => sum + Number(row.completedAppointments || 0), 0);
      const avg = totalCompletedAppointments ? Math.round(totalRevenue / totalCompletedAppointments) : 0;

      return [
        { label: "Total Revenue", value: formatMoney(totalRevenue) },
        { label: "Total Complete Appointments", value: totalCompletedAppointments },
        { label: "Avg Consultation Fee", value: formatMoney(avg) },
      ];
    }

    if (reportType === "status") {
      const total = reportRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
      const completed = reportRows
        .filter((row) => normalizeStatus(row.status) === "completed")
        .reduce((sum, row) => sum + Number(row.count || 0), 0);
      const cancelled = reportRows
        .filter((row) => normalizeStatus(row.status) === "cancelled")
        .reduce((sum, row) => sum + Number(row.count || 0), 0);

      return [
        { label: "Total Appointments", value: total },
        { label: "Completed", value: completed },
        { label: "Cancelled", value: cancelled },
      ];
    }

    const total = reportRows.length;
    const completed = reportRows.filter((row) => normalizeStatus(row.status) === "completed").length;
    const cancelled = reportRows.filter((row) => normalizeStatus(row.status) === "cancelled").length;

    return [
      { label: "Total Appointments", value: total },
      { label: "Completed", value: completed },
      { label: "Cancelled", value: cancelled },
    ];
  }, [reportRows, reportType]);

  const chartData = useMemo(() => {
    if (!reportRows.length) return { bar: [], pie: [] };

    if (reportType === "revenue") {
      const bar = reportRows
        .slice()
        .reverse()
        .slice(-10)
        .map((row) => ({ name: row.date, value: Number(row.estimatedRevenue || 0) }));

      const totalRevenue = reportRows.reduce((sum, row) => sum + Number(row.estimatedRevenue || 0), 0);
      const completed = reportRows.reduce((sum, row) => sum + Number(row.completedAppointments || 0), 0);
      const notCompleted = reportRows.reduce((sum, row) => sum + (Number(row.totalAppointments || 0) - Number(row.completedAppointments || 0)), 0);

      const pie = [
        { name: "Revenue", value: totalRevenue },
        { name: "Completed", value: completed },
        { name: "Not Completed", value: notCompleted },
      ].filter((item) => item.value > 0);

      return { bar, pie };
    }

    if (reportType === "status") {
      const bar = reportRows.map((row) => ({ name: row.status, value: Number(row.count || 0) }));
      const pie = reportRows.map((row) => ({ name: row.status, value: Number(row.count || 0) }));
      return { bar, pie };
    }

    const statusMap = new Map();
    reportRows.forEach((row) => {
      const key = row.status || "Pending";
      statusMap.set(key, (statusMap.get(key) || 0) + 1);
    });

    const bar = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
    const pie = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    return { bar, pie };
  }, [reportRows, reportType]);

  const columns = useMemo(() => {
    if (reportType === "revenue") {
      return [
        { key: "date", label: "Date" },
        { key: "totalAppointments", label: "Total Appointments" },
        { key: "completedAppointments", label: "Total Complete Appointments" },
        { key: "avgFee", label: "Consultation Fee", formatter: (v) => formatMoney(v) },
        { key: "estimatedRevenue", label: "Total Revenue", formatter: (v) => formatMoney(v) },
      ];
    }

    if (reportType === "status") {
      return [
        { key: "dateRange", label: "Date Range" },
        { key: "status", label: "Status" },
        { key: "count", label: "Count" },
        { key: "percentage", label: "Percentage", formatter: (v) => `${Number(v || 0)}%` },
      ];
    }

    return [
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "patientName", label: "Patient Name" },
      { key: "status", label: "Status" },
      { key: "fees", label: "Consultation Fee", formatter: (v) => formatMoney(v) },
    ];
  }, [reportType]);

  const getCell = (row, column) => {
    const value = row?.[column.key];
    if (column.formatter) return column.formatter(value, row);
    if (value === undefined || value === null || value === "") return "-";
    return value;
  };

  const getCsvCell = (row, column) => {
    const key = column.key;
    if (["estimatedRevenue", "avgFee", "fees"].includes(key)) {
      return Number(row?.[key] || 0);
    }
    if (key === "date") {
      return asCsvDateText(row?.rawDate || row?.[key]);
    }
    if (key === "dateRange") {
      return row?.dateRange || `${reportRange.from} - ${reportRange.to}`;
    }

    // Use display formatter for CSV when available (e.g. percentage -> "45%")
    if (column.formatter) {
      return column.formatter(row?.[key], row);
    }

    const value = row?.[key];
    if (value === undefined || value === null || value === "") return "-";
    return value;
  };

  const downloadCSV = () => {
    if (!reportRows.length) return;

    const reportTypeLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label || reportType;
    const generatedLabel = asCsvDateText(generatedAt || new Date());
    const rangeLabel = `${reportRange.from} - ${reportRange.to}`;

    const headers = ["Sr No", ...columns.map((c) => c.label)];
    const rows = reportRows.map((row, index) => {
      return [
        csvCell(index + 1),
        ...columns.map((column) => csvCell(getCsvCell(row, column))),
      ].join(",");
    });

    const metadataRows = [
      ["Report Type", reportTypeLabel],
      ["Time Period", period],
      ["Generated At", generatedLabel],
      ["From Date", asCsvDateText(reportRange.from)],
      ["To Date", asCsvDateText(reportRange.to)],
      ["Date Range", rangeLabel],
    ].map((row) => row.map(csvCell).join(","));

    const content = ["sep=,", ...metadataRows, "", headers.map(csvCell).join(","), ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `doctor_report_${reportType}_${period}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!reportRows.length) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 28;
    const contentWidth = pageWidth - margin * 2;
    const reportTypeLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label || reportType;
    const selectedPeriodLabel = PERIODS.find((item) => item.value === period)?.label || period;

    const drawTag = ({ x, y, text, width }) => {
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(x, y, width, 22, 5, 5, "F");
      doc.setTextColor(224, 242, 254);
      doc.setFontSize(10);
      doc.text(text, x + 8, y + 15);
    };

    const drawSummaryCard = ({ x, y, title, value, border, bg, titleColor, valueColor }) => {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(border[0], border[1], border[2]);
      doc.roundedRect(x, y, 164, 78, 8, 8, "FD");
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      doc.setFontSize(10);
      doc.text(title, x + 12, y + 20);
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text(String(value), x + 12, y + 48, { maxWidth: 138 });
      doc.setFont("helvetica", "normal");
    };

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, margin, contentWidth, 124, 6, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Doctor Report", margin + 16, margin + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(219, 234, 254);
    doc.text("Doctor Appointment Booking System", margin + 16, margin + 56);

    drawTag({ x: margin + 16, y: margin + 70, text: "Doctor: Self", width: 130 });
    drawTag({ x: margin + 154, y: margin + 70, text: `Time Period: ${selectedPeriodLabel}`, width: 146 });
    drawTag({
      x: margin + 308,
      y: margin + 70,
      text: `Range: ${reportRange.from} to ${reportRange.to}`,
      width: 216,
    });

    const reportTypeBoxWidth = 170;
    const reportTypeBoxX = pageWidth - margin - reportTypeBoxWidth - 10;
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(reportTypeBoxX, margin + 16, reportTypeBoxWidth, 44, 6, 6, "F");
    doc.setTextColor(219, 234, 254);
    doc.setFontSize(10);
    doc.text("Report Type", reportTypeBoxX + 12, margin + 34);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(reportTypeLabel, reportTypeBoxX + 12, margin + 50, { maxWidth: reportTypeBoxWidth - 24 });
    doc.setFont("helvetica", "normal");

    const cardY = margin + 148;
    const cards = summaryCards.slice(0, 3);
    const cardThemes = [
      { border: [147, 197, 253], bg: [239, 246, 255], titleColor: [37, 99, 235], valueColor: [30, 64, 175] },
      { border: [134, 239, 172], bg: [240, 253, 244], titleColor: [22, 163, 74], valueColor: [21, 128, 61] },
      { border: [253, 224, 71], bg: [254, 249, 195], titleColor: [202, 138, 4], valueColor: [180, 83, 9] },
    ];

    cards.forEach((card, index) => {
      drawSummaryCard({
        x: margin + 16 + index * 174,
        y: cardY,
        title: card.label,
        value: card.value,
        ...cardThemes[index],
      });
    });

    doc.setDrawColor(209, 213, 219);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(margin + 16, cardY + 96, pageWidth - margin - 16, cardY + 96);
    doc.setLineDashPattern([], 0);

    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("REPORT DETAILS", margin + 16, cardY + 118);
    doc.setFont("helvetica", "normal");

    autoTable(doc, {
      startY: cardY + 132,
      head: [["Sr No", ...columns.map((c) => c.label)]],
      body: reportRows.map((row, index) => [
        index + 1,
        ...columns.map((column) => {
          if (["estimatedRevenue", "avgFee", "fees"].includes(column.key)) {
            return formatMoney(row?.[column.key]);
          }
          return getCell(row, column);
        }),
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 5, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin + 12, right: margin + 12 },
      didParseCell: (hookData) => {
        if (hookData.section !== "body") return;

        const statusColumnIndex = columns.findIndex((column) => column.key === "status");
        const statusColumnInPdf = statusColumnIndex === -1 ? -1 : statusColumnIndex + 1;

        if (statusColumnInPdf === -1 || hookData.column.index !== statusColumnInPdf) return;

        const status = String(hookData.cell.raw || "").toLowerCase();

        if (status.includes("completed")) {
          hookData.cell.styles.textColor = [21, 128, 61];
          hookData.cell.styles.fillColor = [220, 252, 231];
        } else if (status.includes("approved")) {
          hookData.cell.styles.textColor = [37, 99, 235];
          hookData.cell.styles.fillColor = [219, 234, 254];
        } else if (status.includes("cancelled")) {
          hookData.cell.styles.textColor = [185, 28, 28];
          hookData.cell.styles.fillColor = [254, 226, 226];
        } else if (status.includes("rejected") || status.includes("no-show")) {
          hookData.cell.styles.textColor = [153, 27, 27];
          hookData.cell.styles.fillColor = [254, 242, 242];
        } else if (status.includes("pending")) {
          hookData.cell.styles.textColor = [161, 98, 7];
          hookData.cell.styles.fillColor = [254, 249, 195];
        }
      },
    });

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated by Doctor Panel • Page ${page} of ${totalPages}`, margin + 16, pageHeight - 20);
      doc.text("Confidential • Doctor Use Only", pageWidth - margin - 138, pageHeight - 20);
    }

    doc.save(`doctor_report_${reportType}_${period}_${Date.now()}.pdf`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef5ff 0%,#ffffff 52%,#e7f2ff 100%)", padding: "26px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Doctor Report</h1>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "#64748b" }}>Generate detailed report with charts and export options.</p>
          <p style={{ margin: "5px 0 0", fontSize: 12, color: "#1e40af", fontWeight: 700 }}>
            Date Range: {reportRange.from} - {reportRange.to}
          </p>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #dbeafe", borderRadius: 16, padding: 16, boxShadow: "0 2px 10px rgba(37,99,235,.06)", display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr 160px", gap: 12 }}>
          <div>
            <label htmlFor="reportType" style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
              Report Type
            </label>
            <select
              id="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ width: "100%", height: 42, borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", padding: "0 12px", color: "#1e3a8a", fontWeight: 600 }}
            >
              {REPORT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="period" style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
              Time Period
            </label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: "100%", height: 42, borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", padding: "0 12px", color: "#1e3a8a", fontWeight: 600 }}
            >
              {PERIODS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          {period === "yearly" ? (
            <div>
              <label htmlFor="yearPicker" style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
                Year
              </label>
              <select
                id="yearPicker"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ width: "100%", height: 42, borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", padding: "0 12px", color: "#1e3a8a", fontWeight: 600 }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <p style={{ margin: "6px 2px 0", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Date Range: {selectedPeriodRangeLabel.from} - {selectedPeriodRangeLabel.to}
              </p>
            </div>
          ) : null}

          {period === "monthly" ? (
            <div>
              <label htmlFor="monthPicker" style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
                Month
              </label>
              <input
                id="monthPicker"
                type="month"
                value={`${selectedYear}-${selectedMonth}`}
                min="2000-01"
                max={`${currentYear}-${String(currentMonth).padStart(2, "0")}`}
                onChange={(e) => {
                  const [yearPart, monthPart] = String(e.target.value || "").split("-");
                  if (!monthPart) return;
                  setSelectedYear(yearPart || selectedYear);
                  setSelectedMonth(monthPart);
                }}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  padding: "0 12px",
                  color: "#1e3a8a",
                  fontWeight: 600,
                }}
              />
              <p style={{ margin: "6px 2px 0", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Date Range: {selectedPeriodRangeLabel.from} - {selectedPeriodRangeLabel.to}
              </p>
            </div>
          ) : null}

          {(period === "daily" || period === "weekly") ? (
            <div>
              <label htmlFor="startDatePicker" style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "#64748b", marginBottom: 5 }}>
                Selected Date
              </label>
              <input
                id="startDatePicker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  padding: "0 12px",
                  color: "#1e3a8a",
                  fontWeight: 600,
                }}
              />
              <p style={{ margin: "6px 2px 0", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Date Range: {selectedPeriodRangeLabel.from} - {selectedPeriodRangeLabel.to}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={generateReport}
            disabled={loading}
            style={{
              alignSelf: "start",
              marginTop: 24,
              height: 42,
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(135deg,#2563eb,#38bdf8)",
              color: "#fff",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Loading..." : "Generate Report"}
          </button>

        </div>

        {error ? (
          <div style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 12, padding: "10px 12px", fontWeight: 600 }}>
            {error}
          </div>
        ) : null}

        {isNoDataState ? (
          <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e", borderRadius: 12, padding: "10px 12px", fontWeight: 700 }}>
            {noDataMessage} Please change the date or filters and generate again.
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {summaryCards.map((card) => (
            <div key={card.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #dbeafe", padding: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 700 }}>{card.label}</p>
              <h3 style={{ margin: "8px 0 0", fontSize: 32, color: "#0f172a", fontWeight: 800 }}>{card.value}</h3>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #dbeafe", padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#334155" }}>Bar Chart</p>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.bar} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" angle={-12} textAnchor="end" height={56} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.bar.map((item, index) => (
                      <Cell key={`${item.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #dbeafe", padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#334155" }}>Pie Chart</p>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.pie} dataKey="value" nameKey="name" outerRadius={105} innerRadius={45}>
                    {chartData.pie.map((item, index) => (
                      <Cell key={`${item.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={downloadPDF}
            disabled={!reportRows.length}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              background: "linear-gradient(135deg,#059669,#10b981)",
              color: "#fff",
              fontWeight: 700,
              cursor: reportRows.length ? "pointer" : "not-allowed",
              opacity: reportRows.length ? 1 : 0.65,
            }}
          >
            <Download size={16} /> Download PDF
          </button>

          <button
            type="button"
            onClick={downloadCSV}
            disabled={!reportRows.length}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              background: "linear-gradient(135deg,#047857,#059669)",
              color: "#fff",
              fontWeight: 700,
              cursor: reportRows.length ? "pointer" : "not-allowed",
              opacity: reportRows.length ? 1 : 0.65,
            }}
          >
            <Download size={16} /> Download CSV
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #dbeafe", overflow: "auto" }}>
          <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff" }}>
                <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>Sr No</th>
                {columns.map((column) => (
                  <th key={column.key} style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows.length ? (
                reportRows.map((row, index) => (
                  <tr key={`${index}-${row.date || row.status || "row"}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{index + 1}</td>
                    {columns.map((column) => (
                      <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: "#334155" }}>
                        {getCell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} style={{ padding: 26, textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <FileBarChart2 size={16} /> {hasGenerated ? noDataMessage : "Click Generate to view report data"}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
