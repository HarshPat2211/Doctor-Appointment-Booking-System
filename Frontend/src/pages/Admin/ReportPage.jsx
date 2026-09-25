import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import API from "../util/api";

const REPORT_TYPE_OPTIONS = [
  { label: "Revenue Report", value: "revenue" },
  { label: "Appointment Report", value: "appointments" },
  { label: "Doctor-wise Report", value: "doctor-wise" },
];

const PERIOD_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const CHART_COLORS = ["#2563eb", "#0ea5e9", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const formatCurrencyPdf = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const formatDateDDMMYYYY = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getTodayDateValue = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toStartOfDay = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getWindowForPeriod = (period, { selectedDate }) => {
  const now = new Date();
  const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (Number.isNaN(base.getTime())) {
    const fallback = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start: fallback, end: fallback };
  }

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

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

  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatMonthLabel = (value) => {
  if (!value) return "Current Month";
  const match = String(value).match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const csvCell = (value) => {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
};

const normalizeStatus = (status) => String(status || "").toLowerCase();

const buildDoctorAggregatesFromAppointments = (rows = []) => {
  const map = new Map();

  rows.forEach((row) => {
    const doctorName = row?.doctorName || "Unknown Doctor";
    const specialization = row?.specialization || "General";
    const key = `${doctorName}|${specialization}`;

    if (!map.has(key)) {
      map.set(key, {
        doctorName,
        specialization,
        totalAppointments: 0,
        consideredAppointments: 0,
        completedAppointments: 0,
        completedRevenue: 0,
        cancelledAppointments: 0,
        revenue: 0,
        doctorFee: 0,
      });
    }

    const entry = map.get(key);
    const status = normalizeStatus(row?.appointmentStatus);
    const fee = Number(row?.fees || 0);

    if (!entry.doctorFee && fee > 0) {
      entry.doctorFee = fee;
    }

    entry.totalAppointments += 1;

    if (status.includes("completed")) {
      entry.completedAppointments += 1;
      entry.completedRevenue += fee;
    }

    if (status.includes("cancelled")) {
      entry.cancelledAppointments += 1;
    }

    if (!status.includes("cancelled") && !status.includes("rejected") && !status.includes("no-show")) {
      entry.consideredAppointments += 1;
      entry.revenue += fee;
    }
  });

  return Array.from(map.values());
};

const statusCountsFromRows = (rows = []) => {
  const counts = { Completed: 0, Cancelled: 0, Rejected: 0, Pending: 0, Approved: 0 };
  rows.forEach((row) => {
    const status = String(row?.appointmentStatus || "").toLowerCase();
    if (status.includes("completed")) counts.Completed += 1;
    else if (status.includes("cancelled")) counts.Cancelled += 1;
    else if (status.includes("rejected")) counts.Rejected += 1;
    else if (status.includes("approved")) counts.Approved += 1;
    else counts.Pending += 1;
  });
  return counts;
};

const getColumns = (reportType) => {
  if (reportType === "revenue") {
    return [
      { key: "doctorName", label: "Doctor Name" },
      { key: "specialization", label: "Specialization" },
      { key: "totalAppointments", label: "Total Appointments" },
      { key: "completedAppointments", label: "Complete Appointments" },
      { key: "avgFeePerAppointment", label: "Consultation Fee", formatter: (v) => formatCurrency(v) },
      { key: "totalRevenue", label: "Total Revenue", formatter: (v) => formatCurrency(v) },
    ];
  }

  if (reportType === "doctor-wise") {
    return [
      { key: "doctorName", label: "Doctor Name" },
      { key: "specialization", label: "Specialization" },
      { key: "totalAppointments", label: "Total Appointments" },
      { key: "completedAppointments", label: "Completed" },
      { key: "cancelledAppointments", label: "Cancelled" },
      { key: "completionRate", label: "Completion Rate", formatter: (v) => `${Number(v || 0)}%` },
      { key: "consultationFee", label: "Consultation Fee", formatter: (v) => formatCurrency(v) },
    ];
  }

  return [
    { key: "date", label: "Date", formatter: (v) => formatDateDDMMYYYY(v) },
    { key: "patientName", label: "Patient Name" },
    { key: "doctorName", label: "Doctor Name" },
    { key: "specialization", label: "Specialization" },
    { key: "appointmentStatus", label: "Status" },
    { key: "fees", label: "Consultation Fee", formatter: (v) => formatCurrency(v) },
    { key: "appointmentTime", label: "Time Slot" },
  ];
};

export default function ReportPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [reportType, setReportType] = useState("revenue");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [period, setPeriod] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateValue());
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth).padStart(2, "0"));
  const [doctors, setDoctors] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    rejectedAppointments: 0,
  });
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);

  const tableColumns = useMemo(() => getColumns(reportType), [reportType]);
  const yearOptions = useMemo(() => {
    return Array.from({ length: currentYear - 2000 + 1 }, (_, index) => String(currentYear - index));
  }, [currentYear]);

  const selectedDateTokens = useMemo(() => {
    const parsed = toStartOfDay(selectedDate) || new Date();
    const year = String(parsed.getFullYear());
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate());
    const date = `${year}-${month}-${String(parsed.getDate()).padStart(2, "0")}`;
    return {
      periodDate: date,
      periodMonth: period === "monthly" ? `${selectedYear}-${selectedMonth}` : `${year}-${month}`,
      periodYear: period === "yearly" ? selectedYear : year,
      periodDay: day,
    };
  }, [period, selectedDate, selectedYear, selectedMonth]);

  useEffect(() => {
    if (period !== "monthly") return;
    if (Number(selectedYear) !== currentYear) return;
    if (Number(selectedMonth) <= currentMonth) return;
    setSelectedMonth(String(currentMonth).padStart(2, "0"));
  }, [period, selectedYear, selectedMonth, currentYear, currentMonth]);

  const selectedDateWindow = useMemo(() => {
    if (!period) {
      return { start: null, end: null };
    }

    const baseDate = period === "yearly"
      ? `${selectedYear}-01-01`
      : period === "monthly"
        ? `${selectedYear}-${selectedMonth}-01`
        : selectedDate;

    return getWindowForPeriod(period, { selectedDate: baseDate });
  }, [period, selectedDate, selectedYear, selectedMonth]);

  const selectedPeriodLabel = useMemo(() => {
    if (!period) return "Not selected";
    if (period === "daily" || period === "weekly") {
      return formatDateDDMMYYYY(selectedDateTokens.periodDate);
    }
    if (period === "monthly") {
      return formatMonthLabel(selectedDateTokens.periodMonth);
    }
    return selectedYear;
  }, [period, selectedDateTokens, selectedYear]);

  const noDataMessage = useMemo(() => {
    if (!selectedDateWindow?.start || !selectedDateWindow?.end) {
      return "No report data found for the selected time period.";
    }
    return `No report data found for the selected time period (${selectedPeriodLabel}) from ${formatDateDDMMYYYY(selectedDateWindow.start)} to ${formatDateDDMMYYYY(selectedDateWindow.end)}.`;
  }, [selectedPeriodLabel, selectedDateWindow]);

  const isNoDataState = hasGenerated && !reportLoading && !error && reportData.length === 0;

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setDoctorLoading(true);
        const { data } = await API.get("/admin/doctors");
        const normalized = Array.isArray(data)
          ? data.map((doctor) => ({
            id: doctor?._id,
            name: doctor?.user?.name || "Unknown Doctor",
            specialization: doctor?.specialization || "General",
            fees: Number(doctor?.fees || 0),
          }))
          : [];
        setDoctors(normalized);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load doctors");
      } finally {
        setDoctorLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const generateReport = async () => {
    if (!period) {
      setError("Please select a time period");
      return;
    }

    try {
      setReportLoading(true);
      setError("");

      const { data } = await API.get("/admin/report", {
        params: {
          reportType,
          doctor: selectedDoctor,
          period,
          periodDate: selectedDateTokens.periodDate,
          periodMonth: selectedDateTokens.periodMonth,
          periodYear: selectedDateTokens.periodYear,
          periodDay: selectedDateTokens.periodDay,
        },
      });

      const rows = Array.isArray(data?.data) ? data.data : [];

      let normalizedRows = rows;
      if (reportType === "revenue" && rows.length > 0 && rows[0]?.totalRevenue === undefined) {
        const aggregateRows = buildDoctorAggregatesFromAppointments(rows);
        normalizedRows = aggregateRows
          .sort((a, b) => b.completedRevenue - a.completedRevenue)
          .map((entry) => ({
            doctorName: entry.doctorName,
            specialization: entry.specialization,
            totalAppointments: entry.totalAppointments,
            completedAppointments: entry.completedAppointments,
            consideredAppointments: entry.completedAppointments,
            totalRevenue: entry.completedRevenue,
            avgFeePerAppointment: entry.completedAppointments
              ? Math.round(entry.completedRevenue / entry.completedAppointments)
              : 0,
          }));
      }

      if (reportType === "revenue") {
        normalizedRows = normalizedRows.map((row) => {
          const completedAppointments = Number(row?.completedAppointments ?? row?.consideredAppointments ?? 0);
          const totalRevenue = Number(row?.totalRevenue ?? row?.revenue ?? 0);
          const appointmentFee = Number(
            row?.appointmentFee
            ?? row?.avgFeePerAppointment
            ?? row?.doctorFee
            ?? (completedAppointments ? Math.round(totalRevenue / completedAppointments) : 0)
          );

          return {
            ...row,
            completedAppointments,
            consideredAppointments: completedAppointments,
            totalRevenue,
            avgFeePerAppointment: appointmentFee,
            appointmentFee,
          };
        });
      }

      if (reportType === "doctor-wise" && rows.length > 0 && rows[0]?.completionRate === undefined) {
        const aggregateRows = buildDoctorAggregatesFromAppointments(rows);
        normalizedRows = aggregateRows
          .sort((a, b) => b.totalAppointments - a.totalAppointments)
          .map((entry) => ({
            doctorName: entry.doctorName,
            specialization: entry.specialization,
            totalAppointments: entry.totalAppointments,
            completedAppointments: entry.completedAppointments,
            cancelledAppointments: entry.cancelledAppointments,
            completionRate: entry.totalAppointments
              ? Math.round((entry.completedAppointments / entry.totalAppointments) * 100)
              : 0,
            consultationFee: entry.doctorFee
              || (entry.consideredAppointments
                ? Math.round(entry.revenue / entry.consideredAppointments)
                : 0),
          }));
      }

      if (reportType === "doctor-wise") {
        normalizedRows = normalizedRows.map((row) => {
          const rowDoctorName = String(row?.doctorName || "").trim().toLowerCase();
          const rowSpecialization = String(row?.specialization || "General").trim().toLowerCase();
          const doctorMasterFee = Number(
            doctors.find((doctor) => {
              const doctorName = String(doctor?.name || "").trim().toLowerCase();
              const doctorSpecialization = String(doctor?.specialization || "General").trim().toLowerCase();
              return doctorName === rowDoctorName && doctorSpecialization === rowSpecialization;
            })?.fees || 0
          );

          const directFee = Number(
            row?.consultationFee
            ?? row?.doctorFee
            ?? row?.appointmentFee
            ?? row?.avgFeePerAppointment
            ?? 0
          );

          if (directFee > 0) {
            return { ...row, consultationFee: directFee };
          }

          if (doctorMasterFee > 0) {
            return { ...row, consultationFee: doctorMasterFee };
          }

          const completed = Number(row?.completedAppointments || 0);
          const totalRevenue = Number(row?.totalRevenue ?? row?.revenue ?? 0);
          return {
            ...row,
            consultationFee: completed ? Math.round(totalRevenue / completed) : 0,
          };
        });
      }

      setReportData(normalizedRows);
      setHasGenerated(true);
      setSummary({
        totalRevenue: Number(data?.totalRevenue || 0),
        totalAppointments: Number(data?.totalAppointments || 0),
        completedAppointments: Number(data?.completedAppointments || 0),
        cancelledAppointments: Number(data?.cancelledAppointments || 0),
        rejectedAppointments: Number(data?.rejectedAppointments || 0),
      });
    } catch (err) {
      setReportData([]);
      setSummary({ totalRevenue: 0, totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, rejectedAppointments: 0 });
      setError(err?.response?.data?.message || "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (reportType === "revenue") {
      const completed = summary.totalAppointments
        ? Number(summary.completedAppointments || 0)
        : reportData.reduce((sum, row) => sum + Number(row?.completedAppointments || row?.consideredAppointments || 0), 0);
      const computedRevenue = reportData.reduce((sum, row) => sum + Number(row?.totalRevenue || 0), 0);
      const totalRevenue = Number(summary.totalRevenue || computedRevenue || 0);
      const avg = completed ? Math.round(totalRevenue / completed) : 0;
      return [
        { label: "Total Revenue", value: formatCurrency(totalRevenue) },
        { label: "Total Complete Appointments", value: completed },
        { label: "Avg Consultation Fee", value: formatCurrency(avg) },
      ];
    }

    if (reportType === "doctor-wise") {
      const doctorsCovered = reportData.length;
      const totalCompletedAppointments = reportData.reduce((sum, row) => sum + Number(row?.completedAppointments || 0), 0);
      const avgCompletion = doctorsCovered
        ? Math.round(reportData.reduce((sum, row) => sum + Number(row?.completionRate || 0), 0) / doctorsCovered)
        : 0;
      return [
        { label: "Doctors Covered", value: doctorsCovered },
        { label: "Total Complete Appointments", value: totalCompletedAppointments || summary.completedAppointments },
        { label: "Average Completion", value: `${avgCompletion}%` },
      ];
    }

    const statusCounts = statusCountsFromRows(reportData);
    return [
      { label: "Total Appointments", value: summary.totalAppointments || reportData.length },
      { label: "Completed", value: summary.completedAppointments || statusCounts.Completed },
      { label: "Cancelled", value: summary.cancelledAppointments || statusCounts.Cancelled },
    ];
  }, [reportType, reportData, summary]);

  const chartData = useMemo(() => {
    if (reportType === "revenue") {
      const bar = reportData.slice(0, 8).map((row) => ({ name: row.doctorName, value: Number(row.totalRevenue || 0) }));
      const specMap = {};
      reportData.forEach((row) => {
        const key = row.specialization || "General";
        specMap[key] = (specMap[key] || 0) + Number(row.totalRevenue || 0);
      });
      const pie = Object.entries(specMap).map(([name, value]) => ({ name, value }));
      return { bar, pie };
    }

    if (reportType === "doctor-wise") {
      const bar = reportData.slice(0, 8).map((row) => ({ name: row.doctorName, value: Number(row.totalAppointments || 0) }));
      const completed = reportData.reduce((sum, row) => sum + Number(row.completedAppointments || 0), 0);
      const cancelled = reportData.reduce((sum, row) => sum + Number(row.cancelledAppointments || 0), 0);
      const total = reportData.reduce((sum, row) => sum + Number(row.totalAppointments || 0), 0);
      const other = Math.max(0, total - completed - cancelled);
      const pie = [
        { name: "Completed", value: completed },
        { name: "Cancelled", value: cancelled },
        { name: "Other", value: other },
      ].filter((item) => item.value > 0);
      return { bar, pie };
    }

    const status = statusCountsFromRows(reportData);
    const bar = Object.entries(status).map(([name, value]) => ({ name, value }));
    const pie = Object.entries(status).map(([name, value]) => ({ name, value })).filter((item) => item.value > 0);
    return { bar, pie };
  }, [reportType, reportData]);

  const getCellValue = (row, column) => {
    const raw = row?.[column.key];
    if (column.formatter) return column.formatter(raw, row);
    if (raw === undefined || raw === null || raw === "") return "-";
    return raw;
  };

  const getCsvCellValue = (row, column) => {
    const key = column.key;
    if (["totalRevenue", "avgFeePerAppointment", "consultationFee", "fees"].includes(key)) {
      return Number(row?.[key] || 0);
    }
    if (column.key === "date") {
      return formatDateDDMMYYYY(row?.date);
    }
    const raw = row?.[key];
    if (raw === undefined || raw === null || raw === "") return "-";
    return raw;
  };

  const getPdfCellValue = (row, column) => {
    const key = column.key;
    if (["totalRevenue", "avgFeePerAppointment", "consultationFee", "fees"].includes(key)) {
      return formatCurrencyPdf(row?.[key]);
    }
    if (key === "completionRate") {
      const raw = row?.[key];
      if (raw === undefined || raw === null || raw === "") return "-";
      const value = String(raw);
      if (value.includes("%")) return value;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return `${parsed}%`;
      return `${value}%`;
    }
    if (column.key === "date") {
      return formatDateDDMMYYYY(row?.date);
    }
    const raw = row?.[key];
    if (raw === undefined || raw === null || raw === "") return "-";
    return raw;
  };

  const downloadCSV = () => {
    if (!reportData.length) return;
    const headers = ["Sr No", ...tableColumns.map((column) => column.label)];
    const rows = reportData.map((row, index) =>
      [
        csvCell(index + 1),
        ...tableColumns.map((column) => csvCell(getCsvCellValue(row, column))),
      ].join(",")
    );
    const csvContent = ["sep=,", headers.map(csvCell).join(","), ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${reportType}_${period}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!reportData.length) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 28;
    const contentWidth = pageWidth - margin * 2;

    const reportTypeLabel = REPORT_TYPE_OPTIONS.find((item) => item.value === reportType)?.label || "Report";
    const selectedDoctorLabel = selectedDoctor === "all"
      ? "All Doctors"
      : doctors.find((doctor) => doctor.id === selectedDoctor)?.name || "Selected Doctor";

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
    doc.text("Admin Report", margin + 16, margin + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(219, 234, 254);
    doc.text("Doctor Appointment Booking System", margin + 16, margin + 56);

    drawTag({ x: margin + 16, y: margin + 70, text: `Doctor: ${selectedDoctorLabel}`, width: 152 });
    drawTag({ x: margin + 176, y: margin + 70, text: `Period: ${period ? `${period.charAt(0).toUpperCase()}${period.slice(1)}` : "N/A"}`, width: 120 });
    drawTag({
      x: margin + 304,
      y: margin + 70,
      text: `Range: ${formatDateDDMMYYYY(selectedDateWindow.start)} to ${formatDateDDMMYYYY(selectedDateWindow.end)}`,
      width: 220,
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
    const cards = summaryCards.slice(0, 3).map((card) => {
      const isMoney = card.label.toLowerCase().includes("revenue") || card.label.toLowerCase().includes("fee");
      return {
        ...card,
        value: isMoney ? String(card.value).replace(/₹/g, "Rs ") : card.value,
      };
    });
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
      head: [["Sr No", ...tableColumns.map((column) => column.label)]],
      body: reportData.map((row, index) => [
        index + 1,
        ...tableColumns.map((column) => getPdfCellValue(row, column)),
      ]),
      margin: { left: margin + 12, right: margin + 12 },
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 5, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (hookData) => {
        if (hookData.section !== "body") return;
        const statusColumnIndex = tableColumns.findIndex((column) => column.key === "appointmentStatus");
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
        } else if (status.includes("rejected")) {
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
      doc.text(`Generated by Admin Panel • Page ${page} of ${totalPages}`, margin + 16, pageHeight - 20);
      doc.text("Confidential • Admin Use Only", pageWidth - margin - 140, pageHeight - 20);
    }

    doc.save(`report_${reportType}_${period}_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 p-7 md:p-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div>
          <h1 className="m-0 text-3xl font-extrabold text-blue-950">Generate Report</h1>
          <p className="mt-1 text-sm text-slate-500">Analytics, charts, and table details based on the selected report type.</p>
          {period ? (
            <p className="mt-1 text-xs font-semibold text-blue-700">
              Selected: {selectedPeriodLabel} | Range: {formatDateDDMMYYYY(selectedDateWindow.start)} to {formatDateDDMMYYYY(selectedDateWindow.end)}
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold text-blue-700">Select time period to choose date/year filter.</p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-blue-100 bg-white p-4">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <label htmlFor="reportType" className="text-xs font-bold uppercase tracking-wide text-slate-500">Report Type</label>
            <select id="reportType" value={reportType} onChange={(e) => setReportType(e.target.value)} className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm text-blue-950 outline-none focus:border-blue-400">
              {REPORT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <label htmlFor="doctor" className="text-xs font-bold uppercase tracking-wide text-slate-500">Doctor</label>
            <select id="doctor" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} disabled={doctorLoading} className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm text-blue-950 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-70">
              <option value="all">All Doctors</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <label htmlFor="period" className="text-xs font-bold uppercase tracking-wide text-slate-500">Time Period</label>
            <select
              id="period"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setHasGenerated(false);
              }}
              className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm text-blue-950 outline-none focus:border-blue-400"
            >
              <option value="">Select Time Period</option>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {period === "yearly" ? (
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <label htmlFor="yearPicker" className="text-xs font-bold uppercase tracking-wide text-slate-500">Year</label>
              <select
                id="yearPicker"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setHasGenerated(false);
                }}
                className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm text-blue-950 outline-none focus:border-blue-400"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          ) : null}

          {period === "monthly" ? (
            <div className="flex min-w-[460px] flex-[1.4] flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor="monthPicker" className="text-xs font-bold uppercase tracking-wide text-slate-500">Month</label>
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
                    setHasGenerated(false);
                  }}
                  className="h-11 rounded-xl border border-blue-200 bg-white px-3 text-sm text-blue-950 outline-none focus:border-blue-400"
                />
              </div>
            </div>
          ) : null}

          {period === "weekly" ? (
            <div className="grid min-w-full grid-cols-1 gap-2">
              <label htmlFor="startDatePicker" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Selected Date
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <input
                  id="startDatePicker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setHasGenerated(false);
                  }}
                  className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm text-blue-950 outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={reportLoading || !period}
                  className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {reportLoading ? "Generating..." : "Generate Report"}
                </button>
              </div>

              <p className="text-xs font-semibold text-slate-600">
                Date Range: {formatDateDDMMYYYY(selectedDateWindow.start)} to {formatDateDDMMYYYY(selectedDateWindow.end)}
              </p>
            </div>
          ) : null}

          {period === "daily" ? (
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <label htmlFor="startDatePicker" className="text-xs font-bold uppercase tracking-wide text-slate-500">Date</label>
              <input
                id="startDatePicker"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setHasGenerated(false);
                }}
                className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm text-blue-950 outline-none focus:border-blue-400"
              />
            </div>
          ) : null}

          {period !== "weekly" ? (
            <button type="button" onClick={generateReport} disabled={reportLoading || !period} className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70">
              {reportLoading ? "Generating..." : "Generate Report"}
            </button>
          ) : null}
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}

        {isNoDataState ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {noDataMessage} Please change filter and generate again.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-blue-100 bg-white p-4">
              <p className="m-0 text-sm font-semibold text-slate-500">{card.label}</p>
              <h3 className="mt-2 text-3xl font-extrabold text-blue-950">{card.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-slate-700">Bar Chart</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.bar} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-12} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.bar.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-slate-700">Pie Chart</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.pie} dataKey="value" nameKey="name" outerRadius={95} innerRadius={45}>
                    {chartData.pie.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={downloadPDF} disabled={!reportData.length} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
            <Download size={16} />
            Download PDF
          </button>
          <button type="button" onClick={downloadCSV} disabled={!reportData.length} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
            <Download size={16} />
            Download CSV
          </button>
        </div>

        <div className="overflow-auto rounded-2xl border border-blue-100 bg-white">
          <table className="min-w-[930px] w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-blue-600 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">#</th>
                {tableColumns.map((column) => (
                  <th key={column.key} className="bg-blue-600 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.length ? (
                reportData.map((row, index) => (
                  <tr key={`${index}-${row.doctorName || row.patientName || "row"}`} className="border-t border-blue-50 even:bg-slate-50">
                    <td className="px-3 py-2.5 text-sm text-slate-700">{index + 1}</td>
                    {tableColumns.map((column) => (
                      <td key={`${column.key}-${index}`} className="px-3 py-2.5 text-sm text-slate-700">{getCellValue(row, column)}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableColumns.length + 1} className="px-3 py-6 text-center text-sm text-slate-500">
                    {hasGenerated ? `${noDataMessage} Please change filter and generate again.` : "Select filters and click Generate Report to view data."}
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
