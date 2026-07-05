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

interface PayrollReportItem {
  worker_id: string;
  worker_name: string;
  total_work_hours: number;
  total_break_minutes: number;
  total_correction_minutes: number;
  payable_hours: number;
}

const PayrollReport = () => {
  const router = useRouter();
  const { employees } = useContext(EmployeesContext) as EmployeesContextType;
  const { userCompanyName } = useSession();
  const visibleWorkerIds = useMemo(() => new Set(employees.filter(employee => employee.role === 'worker').map(employee => employee.id)), [employees]);
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [reportData, setReportData] = useState<PayrollReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_monthly_payroll_report', {
        report_year: selectedYear,
        report_month: selectedMonth,
      });

      if (error) {
        console.error('Error fetching payroll report:', error);
        setReportData([]);
      } else {
        setReportData((data || []).filter((row: PayrollReportItem) => visibleWorkerIds.has(row.worker_id)));
      }
      setLoading(false);
    };

    fetchReportData();
  }, [selectedMonth, selectedYear, visibleWorkerIds]);

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
  const period = moment({ year: selectedYear, month: selectedMonth - 1 });
  const periodLabel = period.format('MMMM YYYY');
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
      { hpt: 30 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 30 },
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

  const handleExportExcel = async () => {
    if (reportData.length === 0) return;

    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ['KOORD OFFICIAL PAYROLL REPORT'],
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
      [],
      ['ADMINISTRATIVE NOTES'],
      ['• Payable Hours = (Work Hours) - (Break Time) + (Corrections).'],
      ['• Hourly Rate and Total Pay columns in the next sheet are for manual calculation and verification.'],
      ['• Please ensure all entries comply with local labor regulations before processing payment.'],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 28 }, { wch: 42 }];
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const payrollRows = [
      ['Employee Name', 'Total Work Hours', 'Break Time (min)', 'Correction (min)', 'Payable Hours', 'Hourly Rate', 'Total Pay'],
      ...reportData.map((item, index) => {
        const rowNum = index + 2; // Excel rows are 1-indexed, headers are row 1
        return [
          item.worker_name,
          Number(item.total_work_hours.toFixed(2)),
          item.total_break_minutes,
          item.total_correction_minutes,
          Number(item.payable_hours.toFixed(2)),
          '', // Empty string instead of null for Hourly Rate (manual entry)
          { f: `E${rowNum}*F${rowNum}`, t: 'n' }, // Total Pay formula with explicit numeric type
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
        { f: `SUM(G2:G${reportData.length + 1})`, t: 'n' } // Totals with explicit numeric type
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

    const fileName = `Koord_Payroll_Report_${period.format('MMMM_YYYY')}`;
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
        {/* --- Top Toolbar: Navigator & Export --- */}
        <View style={styles.headerControls}>
          <View style={styles.monthNavigator}>
            <TouchableOpacity style={styles.monthNavButton} onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthDisplayText} fontType="bold">
              {moment({ year: selectedYear, month: selectedMonth - 1 }).format('MMMM YYYY')}
            </Text>
            <TouchableOpacity style={styles.monthNavButton} onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.exportActions}>
            <TouchableOpacity 
              style={[
                styles.iconActionButton,
                { backgroundColor: reportData.length === 0 ? theme.colors.borderColor : theme.colors.success },
              ]}
              onPress={handleExportExcel}
              disabled={reportData.length === 0}
            >
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.iconActionText} fontType="bold">Excel</Text>
            </TouchableOpacity>
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
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: theme.colors.primary }]} fontType="bold">Total Payable</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]} fontType="bold">{totalPayableHours.toFixed(2)}h</Text>
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
                        <Text style={[styles.tableCell, styles.colNumeric, { color: theme.colors.disabledText }]} fontType="regular">Manual Entry</Text>
                        <Text style={[styles.tableCell, styles.colNumeric, { color: theme.colors.disabledText }]} fontType="regular">Manual Entry</Text>
                    </View>
                    ))}
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
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(0.5),
    paddingHorizontal: theme.spacing(1),
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  monthNavButton: {
    padding: theme.spacing(1),
  },
  monthDisplayText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.headingText,
    marginHorizontal: theme.spacing(1),
    width: 140,
    textAlign: 'center',
  },
  exportActions: {
    flexDirection: 'row',
    gap: theme.spacing(1),
  },
  iconActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radius.md,
  },
  iconActionText: {
    color: 'white',
    marginLeft: theme.spacing(1),
    fontSize: theme.fontSizes.sm,
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
