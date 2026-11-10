import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../../../components/Themed';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { theme } from '../../../theme';
import { supabase } from '../../../utils/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import * as XLSX from 'xlsx-js-style';
import { exportWorkbookToExcel } from '../../../utils/exportHelpers';
import { EmployeesContext, EmployeesContextType } from '../../../context/EmployeesContext';
import { useSession } from '../../../context/AuthContext';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

/** Maps ISO 3166-1 alpha-2 country codes to their currency symbol. */
function getCurrencySymbol(country: string | null): string {
  if (!country) return '€';
  const map: Record<string, string> = {
    DE: '€', AT: '€', FR: '€', ES: '€', IT: '€', NL: '€', BE: '€',
    PT: '€', FI: '€', IE: '€', GR: '€', LU: '€', SI: '€', SK: '€',
    EE: '€', LV: '€', LT: '€', CY: '€', MT: '€',
    US: '$', CA: 'CA$', AU: 'A$', GB: '£', CH: 'CHF', SE: 'kr',
    NO: 'kr', DK: 'kr', PL: 'zł', CZ: 'Kč', HU: 'Ft', RO: 'lei',
    TR: '₺', JP: '¥', CN: '¥', KR: '₩', IN: '₹', BR: 'R$',
    MX: '$', SG: 'S$', NZ: 'NZ$', ZA: 'R', AE: 'د.إ', SA: '﷼',
  };
  return map[country.toUpperCase()] ?? '€';
}

interface PayrollReportItem {
  worker_id: string;
  worker_name: string;
  total_work_hours: number;
  total_break_minutes: number;
  total_correction_minutes: number;
  payable_hours: number;
  effective_hourly_rate: number | null; // null if no rate set for this month
  total_pay: number | null;             // null if no rate set for this month
}

const PayrollReport = () => {
  const router = useRouter();
  const { employees } = useContext(EmployeesContext) as EmployeesContextType;
  const { userCompanyName, userCompanyCountry } = useSession();
  const currency = getCurrencySymbol(userCompanyCountry);
  const visibleWorkerIds = useMemo(() => new Set(employees.filter(employee => employee.role === 'worker').map(employee => employee.id)), [employees]);
  const showDATEVExport = userCompanyCountry === 'DE' || userCompanyCountry === 'AT';
  
  // Date range mode: 'month' or 'custom'
  const [dateMode, setDateMode] = useState<'month' | 'custom'>('month');
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [startDate, setStartDate] = useState(moment().startOf('month').toDate());
  const [endDate, setEndDate] = useState(moment().endOf('month').toDate());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [reportData, setReportData] = useState<PayrollReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      
      let data, error;
      
      if (dateMode === 'month') {
        const result = await supabase.rpc('get_monthly_payroll_report', {
          report_year: selectedYear,
          report_month: selectedMonth,
        });
        data = result.data;
        error = result.error;
      } else {
        // Custom date range
        const workerIds = Array.from(visibleWorkerIds);
        const result = await supabase.rpc('get_monthly_payroll_report', {
          p_worker_ids: workerIds,
          p_start_date: moment(startDate).format('YYYY-MM-DD'),
          p_end_date: moment(endDate).format('YYYY-MM-DD'),
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching payroll report:', error);
        setReportData([]);
      } else {
        // Map the data to ensure consistent field names (custom range returns worker_full_name)
        const normalizedData = (data || []).map((row: any) => ({
          ...row,
          worker_name: row.worker_name || row.worker_full_name,
        }));
        setReportData(
          normalizedData.filter((row: PayrollReportItem) => visibleWorkerIds.has(row.worker_id))
        );
      }
      setLoading(false);
    };

    fetchReportData();
  }, [dateMode, selectedMonth, selectedYear, startDate, endDate, visibleWorkerIds]);

  const handlePrevMonth = () => {
    const newDate = moment({ year: selectedYear, month: selectedMonth - 1 }).subtract(1, 'month');
    setSelectedYear(newDate.year());
    setSelectedMonth(newDate.month() + 1);
  };

  const handleNextMonth = () => {
    const newDate = moment({ year: selectedYear, month: selectedMonth - 1 }).add(1, 'month');
    setSelectedYear(newDate.year());
    setSelectedMonth(newDate.month() + 1);
  };

  const totalWorkHours = reportData.reduce((sum: number, item) => sum + (item.total_work_hours || 0), 0);
  const totalBreakMinutes = reportData.reduce((sum: number, item) => sum + (item.total_break_minutes || 0), 0);
  const totalCorrectionMinutes = reportData.reduce((sum: number, item) => sum + (item.total_correction_minutes || 0), 0);
  const totalPayableHours = reportData.reduce((sum: number, item) => sum + (item.payable_hours || 0), 0);
  const totalPayableMoney = reportData.reduce((sum: number, item) => sum + (item.total_pay || 0), 0);
  
  const period = dateMode === 'month' 
    ? moment({ year: selectedYear, month: selectedMonth - 1 })
    : null;
  const periodLabel = dateMode === 'month' 
    ? period!.format('MMMM YYYY')
    : `${moment(startDate).format('MMM D, YYYY')} - ${moment(endDate).format('MMM D, YYYY')}`;
  const generatedAt = moment().format('MMM D, YYYY HH:mm');
  const reportCompanyName = userCompanyName || 'Company';

  const columnDefinitions = [
    ['Employee Name', 'Worker included in this payroll period.'],
    ['Total Work Hours', 'Total clocked work time before break deductions and manual corrections.'],
    ['Break Time (min)', 'Total unpaid break minutes recorded during the period.'],
    ['Correction (min)', 'Manual adjustment minutes. Positive values add payable time; negative values remove payable time.'],
    ['Payable Hours', 'Final payable hours after breaks and corrections. This is the main payroll figure.'],
    ['Hourly Rate', 'Enter the hourly pay rate for this worker (manual entry).'],
    ['Total Pay', 'Calculated total pay for the period (Payable Hours × Hourly Rate).'],
  ];

  const excelColors = {
    primary: '1A1A1C',   // Deep charcoal (headingText)
    primaryMuted: 'F3F4F6', // Very light gray for subtle headers
    accent: 'BEBEBE',    // App border color
    dark: '1A1A1C',      // Deep charcoal
    slate: '3A3A3C',     // bodyText
    border: 'D1D5DB',    // Standard clean border
    page: 'F9FAFB',      // Near-white background
    success: '16A34A',   // App success green
    danger: 'DC2626',    // App danger red
    white: 'FFFFFF',
  };

  const thinBorder = {
    top: { style: 'thin', color: { rgb: excelColors.border } },
    bottom: { style: 'thin', color: { rgb: excelColors.border } },
    left: { style: 'thin', color: { rgb: excelColors.border } },
    right: { style: 'thin', color: { rgb: excelColors.border } },
  };

  const mergeStyle = (...styles: any[]) => Object.assign({}, ...styles);

  const solidFill = (rgb: string) => ({ patternType: 'solid', fgColor: { rgb } });

  const setCellStyle = (sheet: XLSX.WorkSheet, address: string, style: any) => {
    if (!sheet[address]) return;
    sheet[address].s = mergeStyle(sheet[address].s || {}, style);
  };

  const styleRow = (sheet: XLSX.WorkSheet, rowIndex: number, fromCol: number, toCol: number, style: any) => {
    for (let col = fromCol; col <= toCol; col += 1) {
      setCellStyle(sheet, XLSX.utils.encode_cell({ r: rowIndex, c: col }), style);
    }
  };

  const styleColumn = (sheet: XLSX.WorkSheet, colIndex: number, fromRow: number, toRow: number, style: any) => {
    for (let row = fromRow; row <= toRow; row += 1) {
      setCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: colIndex }), style);
    }
  };

  const applyWorkbookStyling = (summarySheet: XLSX.WorkSheet, payrollSheet: XLSX.WorkSheet, definitionsSheet: XLSX.WorkSheet) => {
    // Use a single standard system font to avoid file corruption
    const fontName = 'Segoe UI';
    
    const titleStyle = {
      font: { bold: true, sz: 20, color: { rgb: excelColors.primary }, name: fontName },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    const labelStyle = {
      font: { bold: true, color: { rgb: excelColors.slate }, sz: 10, name: fontName },
      fill: solidFill(excelColors.page),
      border: thinBorder,
      alignment: { vertical: 'center', indent: 1 },
    };
    const valueStyle = {
      font: { color: { rgb: excelColors.dark }, sz: 10, name: fontName },
      border: thinBorder,
      alignment: { vertical: 'center', indent: 1 },
    };
    const sectionHeaderStyle = {
      font: { bold: true, color: { rgb: excelColors.primary }, sz: 11, name: fontName },
      fill: solidFill(excelColors.primaryMuted),
      border: {
        bottom: { style: 'thin', color: { rgb: excelColors.primary } },
      },
      alignment: { vertical: 'center', indent: 1 },
    };
    const tableHeaderStyle = {
      font: { bold: true, color: { rgb: excelColors.primary }, sz: 10, name: fontName },
      fill: solidFill(excelColors.primaryMuted),
      border: {
        top: { style: 'thin', color: { rgb: excelColors.border } },
        bottom: { style: 'medium', color: { rgb: excelColors.primary } },
      },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    const tableCellStyle = {
      border: {
        bottom: { style: 'thin', color: { rgb: excelColors.border } },
      },
      alignment: { vertical: 'center', indent: 1 },
      font: { sz: 10, color: { rgb: excelColors.dark }, name: fontName },
    };
    const numericStyle = {
      ...tableCellStyle,
      alignment: { horizontal: 'right', vertical: 'center', indent: 1 },
      numFmt: '0.00',
    };
    const integerStyle = {
      ...tableCellStyle,
      alignment: { horizontal: 'right', vertical: 'center', indent: 1 },
      numFmt: '0',
    };
    const decimalStyle = {
      ...numericStyle,
      numFmt: '#,##0.00',
    };

    // --- Summary Sheet Styling ---
    summarySheet['!rows'] = [
      { hpt: 40 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 15 },
      { hpt: 30 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 30 }, { hpt: 35 },
      { hpt: 15 }, { hpt: 30 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 },
    ];
    styleRow(summarySheet, 0, 0, 1, titleStyle);
    [1, 2, 3].forEach(row => {
      setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: row, c: 0 }), labelStyle);
      setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: row, c: 1 }), valueStyle);
    });
    styleRow(summarySheet, 5, 0, 1, sectionHeaderStyle);
    [6, 7, 8, 9].forEach(row => {
      setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: row, c: 0 }), labelStyle);
      setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: row, c: 1 }), valueStyle);
    });
    // Totals in Summary
    setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: 10, c: 0 }), {
      ...labelStyle,
      fill: solidFill(excelColors.primary),
      font: { bold: true, color: { rgb: excelColors.white }, name: fontName },
    });
    setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: 10, c: 1 }), {
      ...valueStyle,
      font: { bold: true, sz: 12, color: { rgb: excelColors.primary }, name: fontName },
      fill: solidFill(excelColors.primaryMuted),
      numFmt: '#,##0.00',
    });
    
    // Total Payable Amount in Summary
    setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: 11, c: 0 }), {
      ...labelStyle,
      fill: solidFill(excelColors.success),
      font: { bold: true, color: { rgb: excelColors.white }, sz: 11, name: fontName },
    });
    setCellStyle(summarySheet, XLSX.utils.encode_cell({ r: 11, c: 1 }), {
      ...valueStyle,
      font: { bold: true, sz: 14, color: { rgb: excelColors.success }, name: fontName },
      fill: solidFill('#E8F5E9'),
      alignment: { horizontal: 'right', vertical: 'center', indent: 1 },
    });

    styleRow(summarySheet, 12, 0, 1, sectionHeaderStyle);
    [13, 14, 15].forEach(row => {
      styleRow(summarySheet, row, 0, 1, {
        font: { color: { rgb: excelColors.slate }, italic: true, sz: 9, name: fontName },
        border: { bottom: { style: 'hair', color: { rgb: excelColors.border } } },
        alignment: { wrapText: true, vertical: 'center', indent: 1 },
      });
    });

    // --- Payroll Sheet Styling ---
    if (!payrollSheet['!rows']) payrollSheet['!rows'] = [];
    payrollSheet['!rows'][0] = { hpt: 35 };
    styleRow(payrollSheet, 0, 0, 6, tableHeaderStyle);
    const payrollRange = XLSX.utils.decode_range(payrollSheet['!ref'] || 'A1:G1');
    
    for (let row = 1; row <= payrollRange.e.r; row += 1) {
      payrollSheet['!rows'][row] = { hpt: 28 };
      
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cellValue = payrollSheet[cellAddress]?.v;
      const isSpacer = !cellValue;
      const isTotals = cellValue === 'Totals';
      if (isSpacer) continue;

      const rowFill = isTotals 
        ? solidFill(excelColors.primaryMuted) 
        : (row % 2 === 0 ? solidFill(excelColors.white) : solidFill(excelColors.page));
      
      const rowFontColor = excelColors.dark;

      styleRow(payrollSheet, row, 0, 6, {
        ...tableCellStyle,
        fill: rowFill,
        font: { bold: isTotals, color: { rgb: rowFontColor }, sz: 10, name: fontName },
        border: isTotals ? { top: { style: 'medium', color: { rgb: excelColors.primary } } } : tableCellStyle.border
      });

      styleColumn(payrollSheet, 1, row, row, { ...numericStyle, fill: rowFill });
      styleColumn(payrollSheet, 2, row, row, { ...integerStyle, fill: rowFill });
      styleColumn(payrollSheet, 3, row, row, { ...integerStyle, fill: rowFill });
      styleColumn(payrollSheet, 4, row, row, { 
        ...numericStyle, 
        fill: isTotals ? rowFill : solidFill(excelColors.page),
        font: { bold: true, color: { rgb: excelColors.primary }, name: fontName } 
      });

      styleColumn(payrollSheet, 5, row, row, { ...decimalStyle, fill: rowFill });
      styleColumn(payrollSheet, 6, row, row, {
        ...decimalStyle,
        font: { bold: true, color: { rgb: isTotals ? excelColors.primary : excelColors.success }, name: fontName },
        fill: rowFill
      });

      if (!isTotals) {
        const correctionValue = Number(payrollSheet[XLSX.utils.encode_cell({ r: row, c: 3 })]?.v || 0);
        setCellStyle(payrollSheet, XLSX.utils.encode_cell({ r: row, c: 3 }), {
          ...integerStyle,
          font: { color: { rgb: correctionValue < 0 ? excelColors.danger : excelColors.success }, name: fontName },
          fill: rowFill
        });
      }
    }
    payrollSheet['!autofilter'] = { ref: 'A1:G1' };

    // --- Column Guide Styling ---
    styleRow(definitionsSheet, 0, 0, 1, tableHeaderStyle);
    definitionsSheet['!rows'] = [{ hpt: 30 }];
    const definitionsRange = XLSX.utils.decode_range(definitionsSheet['!ref'] || 'A1:B1');
    for (let row = 1; row <= definitionsRange.e.r; row += 1) {
      definitionsSheet['!rows'][row] = { hpt: 25 };
      styleRow(definitionsSheet, row, 0, 1, {
        ...tableCellStyle,
        fill: solidFill(row % 2 === 0 ? excelColors.page : excelColors.white),
        alignment: { wrapText: true, vertical: 'center', indent: 1 },
      });
      setCellStyle(definitionsSheet, XLSX.utils.encode_cell({ r: row, c: 0 }), {
        ...tableCellStyle,
        font: { bold: true, color: { rgb: excelColors.dark }, sz: 10, name: fontName },
        fill: solidFill(row % 2 === 0 ? excelColors.page : excelColors.white),
      });
    }
  };

  const handleExportDATEV = async () => {
    if (reportData.length === 0) return;

    // DATEV CSV Format Requirements:
    // - Semicolon delimiter (;)
    // - German decimal separator (comma)
    // - German date format (DD.MM.YYYY)
    // - Text fields in quotes
    // - CR/LF line endings (\r\n)
    
    const periodStart = dateMode === 'month'
      ? moment({ year: selectedYear, month: selectedMonth - 1 }).startOf('month')
      : moment(startDate);
    const periodEnd = dateMode === 'month'
      ? moment({ year: selectedYear, month: selectedMonth - 1 }).endOf('month')
      : moment(endDate);

    // DATEV Column Headers (German)
    const headers = [
      'Personalnummer',       // Employee ID
      'Name',                 // Employee Name
      'Datum Von',            // Period Start Date
      'Datum Bis',            // Period End Date
      'Arbeitsstunden',       // Total Work Hours
      'Pausenminuten',        // Break Minutes
      'Korrekturminuten',     // Correction Minutes
      'Abrechnungsstunden',   // Payable Hours
      'Stundenlohn',          // Hourly Rate
      'Gesamtbetrag'          // Total Pay
    ];

    // Helper function to format numbers German-style (comma as decimal separator)
    const formatGermanNumber = (num: number | null): string => {
      if (num === null) return '';
      return num.toFixed(2).replace('.', ',');
    };

    // Helper function to format dates German-style (DD.MM.YYYY)
    const formatGermanDate = (date: moment.Moment): string => {
      return date.format('DD.MM.YYYY');
    };

    // Build CSV rows
    const rows = reportData.map((item) => {
      return [
        `"${item.worker_id}"`,
        `"${item.worker_name}"`,
        `"${formatGermanDate(periodStart)}"`,
        `"${formatGermanDate(periodEnd)}"`,
        formatGermanNumber(item.total_work_hours),
        item.total_break_minutes.toString(),
        item.total_correction_minutes.toString(),
        formatGermanNumber(item.payable_hours),
        formatGermanNumber(item.effective_hourly_rate),
        formatGermanNumber(item.total_pay)
      ].join(';');
    });

    // Combine headers and data
    const csvContent = [
      headers.map(h => `"${h}"`).join(';'),
      ...rows
    ].join('\r\n');

    // Create blob with BOM for proper Excel import
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Generate filename
    const fileName = `DATEV_Lohnabrechnung_${dateMode === 'month' 
      ? moment({ year: selectedYear, month: selectedMonth - 1 }).format('YYYY_MM')
      : `${moment(startDate).format('YYYY-MM-DD')}_bis_${moment(endDate).format('YYYY-MM-DD')}`}.csv`;

    // Download file
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      // For mobile, use the same sharing logic as Excel export
      const FileSystem = require('expo-file-system');
      const Sharing = require('expo-sharing');
      
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, BOM + csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export DATEV CSV'
        });
      }
    }
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) return;

    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ['KOORDINATE OFFICIAL PAYROLL REPORT'],
      ['Organization', reportCompanyName],
      ['Reporting Period', periodLabel],
      ['Generated On', generatedAt],
      [],
      ['PAYROLL SUMMARY'],
      ['Total Employees', reportData.length],
      ['Total Cumulative Hours', Number(totalWorkHours.toFixed(2))],
      ['Total Break Deductions (min)', totalBreakMinutes],
      ['Total Manual Corrections (min)', totalCorrectionMinutes],
      ['FINAL PAYABLE HOURS', Number(totalPayableHours.toFixed(2))],
      ['TOTAL PAYABLE AMOUNT', `${currency}${totalPayableMoney.toFixed(2)}`],
      [],
      ['ADMINISTRATIVE NOTES'],
      ['• Payable Hours = (Work Hours) - (Break Time) + (Corrections).'],
      ['• Hourly Rate and Total Pay are pre-filled from the rate timeline set per worker. Workers without a rate show blank — set their rate in the Team page.'],
      ['• Please ensure all entries comply with local labor regulations before processing payment.'],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 28 }, { wch: 42 }];
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const payrollRows = [
      ['Employee Name', 'Total Work Hours', 'Break Time (min)', 'Correction (min)', 'Payable Hours', 'Hourly Rate', 'Total Pay'],
      ...reportData.map((item, index) => {
        const rowNum = index + 2;
        const rate = item.effective_hourly_rate ?? null;
        const totalPay = item.total_pay ?? null;
        return [
          item.worker_name,
          Number(item.total_work_hours.toFixed(2)),
          item.total_break_minutes,
          item.total_correction_minutes,
          Number(item.payable_hours.toFixed(2)),
          rate !== null ? rate : '',
          totalPay !== null
            ? Number(totalPay.toFixed(2))
            : { f: `E${rowNum}*F${rowNum}`, t: 'n' },
        ];
      }),
      [],
      [
        'Totals',
        Number(totalWorkHours.toFixed(2)),
        totalBreakMinutes,
        totalCorrectionMinutes,
        Number(totalPayableHours.toFixed(2)),
        '',
        { f: `SUM(G2:G${reportData.length + 1})`, t: 'n' }
      ],
    ];
    const payrollSheet = XLSX.utils.aoa_to_sheet(payrollRows);
    payrollSheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
    payrollSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, payrollSheet, 'Payroll');

    const definitionsSheet = XLSX.utils.aoa_to_sheet([
      ['Column', 'Meaning'],
      ...columnDefinitions,
    ]);
    definitionsSheet['!cols'] = [{ wch: 24 }, { wch: 86 }];
    definitionsSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, definitionsSheet, 'Column Guide');

    applyWorkbookStyling(summarySheet, payrollSheet, definitionsSheet);

    const fileName = `Koordinate_Payroll_Report_${dateMode === 'month' 
      ? moment({ year: selectedYear, month: selectedMonth - 1 }).format('MMMM_YYYY')
      : `${moment(startDate).format('YYYY-MM-DD')}_to_${moment(endDate).format('YYYY-MM-DD')}`}`;
    await exportWorkbookToExcel(wb, fileName);
  };

  const tableMinWidth = 1200;

  return (
    <AnimatedScreen>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.headingText} />
        </TouchableOpacity>
        <View>
          <Text style={styles.pageTitle} fontType="bold">Payroll Summary</Text>
          <Text style={styles.pageSubtitle}>Review and export payable hours for the month.</Text>
        </View>
      </View>

      <View style={styles.mainContentCard}>
        {/* --- Unified Control Bar --- */}
        <View style={styles.controlBar}>
          {/* Left: Segmented Control */}
          <SegmentedControl
            values={['Monthly', 'Custom Range']}
            selectedIndex={selectedSegmentIndex}
            onChange={(event) => {
              const index = event.nativeEvent.selectedSegmentIndex;
              setSelectedSegmentIndex(index);
              setDateMode(index === 0 ? 'month' : 'custom');
            }}
            style={styles.segmentedControl}
            backgroundColor={theme.colors.borderColor}
            tintColor={theme.colors.primary}
            fontStyle={{ 
              fontSize: theme.fontSizes.sm, 
              fontFamily: theme.font.regular,
              color: theme.colors.bodyText,
            }}
            activeFontStyle={{ 
              fontSize: theme.fontSizes.sm, 
              fontFamily: theme.font.regular,
              color: 'white',
            }}
          />

          {/* Center: Date Selector */}
          {dateMode === 'month' ? (
            <View style={styles.unifiedSelector}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowButton}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <View style={styles.selectorContent}>
                <Ionicons name="calendar" size={14} color={theme.colors.primary} />
                <Text style={styles.selectorText} fontType="medium">
                  {moment({ year: selectedYear, month: selectedMonth - 1 }).format('MMMM YYYY')}
                </Text>
              </View>
              <TouchableOpacity onPress={handleNextMonth} style={styles.arrowButton}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.unifiedSelector}>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateButtonLabel}>FROM</Text>
                <View style={styles.dateButtonValue}>
                  <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.dateButtonText} fontType="medium">
                    {moment(startDate).format('MMM D, YYYY')}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <Ionicons name="arrow-forward" size={14} color={theme.colors.disabledText} />
              
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateButtonLabel}>TO</Text>
                <View style={styles.dateButtonValue}>
                  <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.dateButtonText} fontType="medium">
                    {moment(endDate).format('MMM D, YYYY')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          
          <DateTimePickerModal
            isVisible={showStartPicker}
            mode="date"
            date={startDate}
            onConfirm={(date) => {
              setStartDate(date);
              setShowStartPicker(false);
            }}
            onCancel={() => setShowStartPicker(false)}
            maximumDate={endDate}
          />
          
          <DateTimePickerModal
            isVisible={showEndPicker}
            mode="date"
            date={endDate}
            onConfirm={(date) => {
              setEndDate(date);
              setShowEndPicker(false);
            }}
            onCancel={() => setShowEndPicker(false)}
            minimumDate={startDate}
          />
          
          {/* Right: Export Button */}
          <View style={styles.controlSection}>
            <TouchableOpacity 
              style={[
                styles.exportButton,
                reportData.length === 0 && styles.exportButtonDisabled,
              ]}
              onPress={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={reportData.length === 0}
            >
              <Ionicons 
                name="download-outline" 
                size={16} 
                color={reportData.length === 0 ? theme.colors.disabledText : theme.colors.primary} 
              />
              <Text 
                style={[
                  styles.exportButtonText,
                  styles.exportButtonPrimaryText,
                  reportData.length === 0 && styles.exportButtonTextDisabled
                ]} 
                fontType="medium"
              >
                Export
              </Text>
              <Ionicons 
                name={exportMenuOpen ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={reportData.length === 0 ? theme.colors.disabledText : theme.colors.primary} 
              />
            </TouchableOpacity>
            
            {exportMenuOpen && reportData.length > 0 && (
              <View style={styles.exportDropdown}>
                <TouchableOpacity 
                  style={styles.exportDropdownItem}
                  onPress={() => {
                    handleExportExcel();
                    setExportMenuOpen(false);
                  }}
                >
                  <Ionicons name="document-outline" size={18} color={theme.colors.success} />
                  <View style={styles.exportDropdownTextContainer}>
                    <Text style={styles.exportDropdownTitle} fontType="medium">Excel Report</Text>
                    <Text style={styles.exportDropdownDesc} fontType="regular">Styled spreadsheet with summary</Text>
                  </View>
                </TouchableOpacity>
                
                {showDATEVExport && (
                  <>
                    <View style={styles.exportDropdownDivider} />
                    <TouchableOpacity 
                      style={styles.exportDropdownItem}
                      onPress={() => {
                        handleExportDATEV();
                        setExportMenuOpen(false);
                      }}
                    >
                      <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
                      <View style={styles.exportDropdownTextContainer}>
                        <Text style={styles.exportDropdownTitle} fontType="medium">DATEV CSV</Text>
                        <Text style={styles.exportDropdownDesc} fontType="regular">German payroll format</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        {/* --- High-Level Stats (Summary on Top) --- */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel} fontType="regular">Total Work Hours</Text>
            <Text style={styles.statValue} fontType="bold">{totalWorkHours.toFixed(2)}h</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={styles.statLabel} fontType="regular">Total Break Time</Text>
            <Text style={styles.statValue} fontType="bold">{totalBreakMinutes}m</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={styles.statLabel} fontType="regular">Total Correction</Text>
            <Text style={styles.statValue} fontType="bold">{totalCorrectionMinutes}m</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={[styles.statLabel, { color: theme.colors.primary }]} fontType="bold">Payable Hours</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]} fontType="bold">{totalPayableHours.toFixed(2)}h</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: theme.colors.success }]} fontType="bold">Total Payable</Text>
            <Text style={[styles.statValue, { color: theme.colors.success, fontSize: 24 }]} fontType="bold">
              {currency}{totalPayableMoney.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* --- Payroll Table --- */}
        <View style={styles.tableContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ flexGrow: 1 }}
            >
            <View style={{ minWidth: tableMinWidth, flex: 1 }}>
                <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colEmployee]} fontType="bold">Employee Name</Text>
                <Text style={[styles.tableHeaderText, styles.colNumeric]} fontType="bold">Total Work Hours</Text>
                <Text style={[styles.tableHeaderText, styles.colNumeric]} fontType="bold">Break (min)</Text>
                <Text style={[styles.tableHeaderText, styles.colNumeric]} fontType="bold">Correction (min)</Text>
                <Text style={[styles.tableHeaderText, styles.colPayable]} fontType="bold">Payable Hours</Text>
                <Text style={[styles.tableHeaderText, styles.colNumeric]} fontType="bold">Hourly Rate</Text>
                <Text style={[styles.tableHeaderText, styles.colNumeric]} fontType="bold">Total Pay</Text>
                </View>
                {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing(4) }} />
                ) : reportData.length === 0 ? (
                <Text style={styles.noDataText} fontType="regular">No data available for the selected period.</Text>
                ) : (
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.tableBodyScroll}
                >
                    {reportData.map((item) => (
                    <View key={item.worker_id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.colEmployee]} fontType="medium">{item.worker_name}</Text>
                        <Text style={[styles.tableCell, styles.colNumeric]} fontType="regular">{item.total_work_hours.toFixed(2)}</Text>
                        <Text style={[styles.tableCell, styles.colNumeric]} fontType="regular">{item.total_break_minutes}</Text>
                        <Text style={[styles.tableCell, styles.colNumeric, { color: item.total_correction_minutes >= 0 ? theme.colors.success : theme.colors.danger }]} fontType="medium">
                            {item.total_correction_minutes >= 0 ? '+' : ''}{item.total_correction_minutes}
                        </Text>
                        <View style={[styles.tableCell, styles.colPayable]}>
                            <View style={styles.payableBadge}>
                                <Text style={styles.payableBadgeText} fontType="bold">{item.payable_hours.toFixed(2)}</Text>
                            </View>
                        </View>
                        {(() => {
                            const rate = item.effective_hourly_rate ?? null;
                            const totalPay = item.total_pay ?? null;
                            return (
                              <>
                                <Text
                                  style={[styles.tableCell, styles.colNumeric, {
                                    color: rate !== null ? theme.colors.headingText : theme.colors.disabledText
                                  }]}
                                  fontType={rate !== null ? 'medium' : 'regular'}
                                >
                                  {rate !== null ? `${currency}${rate.toFixed(2)}` : '—'}
                                </Text>
                                <Text
                                  style={[styles.tableCell, styles.colNumeric, {
                                    color: totalPay !== null ? theme.colors.success : theme.colors.disabledText
                                  }]}
                                  fontType={totalPay !== null ? 'bold' : 'regular'}
                                >
                                  {totalPay !== null ? `${currency}${totalPay.toFixed(2)}` : '—'}
                                </Text>
                              </>
                            );
                        })()}
                    </View>                    ))}
                </ScrollView>
                )}
            </View>
            </ScrollView>
        </View>
      </View>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing(2),
  },
  pageTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
    marginBottom: theme.spacing(0.5),
  },
  pageSubtitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.bodyText,
  },
  mainContentCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    padding: theme.spacing(3),
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(2),
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      native: {
        elevation: 6,
      },
    }),
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3),
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    zIndex: 100,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3),
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    width: '100%',
  },
  segmentedControl: {
    width: 280,
    height: 36,
  },
  unifiedSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    gap: theme.spacing(1.5),
    minHeight: 44,
  },
  arrowButton: {
    padding: theme.spacing(0.5),
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    paddingHorizontal: theme.spacing(1),
    minWidth: 160,
    justifyContent: 'center',
  },
  selectorText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  dateButton: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing(0.5),
  },
  dateButtonLabel: {
    fontSize: 10,
    color: theme.colors.disabledText,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dateButtonValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(0.5),
    paddingHorizontal: theme.spacing(1),
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.sm,
  },
  dateButtonText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(0.75),
  },
  miniLabel: {
    fontSize: 10,
    color: theme.colors.disabledText,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  controlSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportActions: {
    flexDirection: 'row',
    gap: theme.spacing(1),
    position: 'relative',
    zIndex: 101,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(1.5),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    backgroundColor: theme.colors.primary + '10',
  },
  exportButtonDisabled: {
    borderColor: theme.colors.borderColor,
    backgroundColor: theme.colors.pageBackground,
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.success,
  },
  exportButtonPrimaryText: {
    color: theme.colors.primary,
  },
  exportButtonTextDisabled: {
    color: theme.colors.disabledText,
  },
  exportDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: theme.spacing(0.5),
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    minWidth: 240,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      native: {
        elevation: 8,
      },
    }),
    zIndex: 102,
  },
  exportDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
  },
  exportDropdownTextContainer: {
    flex: 1,
  },
  exportDropdownTitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
    marginBottom: 2,
  },
  exportDropdownDesc: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
  },
  exportDropdownDivider: {
    height: 1,
    backgroundColor: theme.colors.borderColor,
    marginHorizontal: theme.spacing(1),
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing(0.5),
  },
  statValue: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.headingText,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.pageBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(2),
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
  },
  tableHeaderText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.headingText,
    paddingHorizontal: theme.spacing(2),
  },
  tableBodyScroll: {
    paddingBottom: theme.spacing(2),
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    paddingVertical: theme.spacing(2),
  },
  tableCell: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
    paddingHorizontal: theme.spacing(2),
  },
  colEmployee: {
    flex: 3,
  },
  colNumeric: {
    flex: 2,
    textAlign: 'center',
  },
  colPayable: {
    flex: 2,
    alignItems: 'center',
  },
  payableBadge: {
    backgroundColor: theme.colors.primaryMuted,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
  },
  payableBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.md,
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: theme.spacing(6),
    fontSize: theme.fontSizes.md,
    color: theme.colors.bodyText,
  },
});

export default PayrollReport;