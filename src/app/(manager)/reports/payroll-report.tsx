import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../../../components/Themed';
import AnimatedScreen from '../../../components/AnimatedScreen';
import { Card } from '../../../components/Card';
import { theme } from '../../../theme';
import { Button } from '../../../components/Button';
import { supabase } from '../../../utils/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { exportToExcel, exportToPDF } from '../../../utils/exportHelpers';

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
        setReportData(data || []);
      }
      setLoading(false);
    };

    fetchReportData();
  }, [selectedMonth, selectedYear]);

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

  const handleExportExcel = async () => {
    if (reportData.length === 0) return;
    
    const excelData = reportData.map(item => ({
      'Employee Name': item.worker_name,
      'Total Work Hours': item.total_work_hours.toFixed(2),
      'Break Time (min)': item.total_break_minutes,
      'Correction (min)': item.total_correction_minutes,
      'Payable Hours': item.payable_hours.toFixed(2),
    }));

    const fileName = `Payroll_Report_${moment({ year: selectedYear, month: selectedMonth - 1 }).format('MMMM_YYYY')}`;
    await exportToExcel(excelData, fileName);
  };

  const handleExportPDF = async () => {
    if (reportData.length === 0) return;

    const period = moment({ year: selectedYear, month: selectedMonth - 1 }).format('MMMM YYYY');
    
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { color: #000; margin-bottom: 5px; }
            h2 { color: #666; font-weight: normal; margin-top: 0; margin-bottom: 30px; }
            .stats-container { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f4f4f4; padding: 15px; border-radius: 8px; }
            .stat-box { text-align: center; flex: 1; }
            .stat-label { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
            .stat-value { font-size: 18px; font-weight: bold; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8f8f8; text-align: left; padding: 12px; border-bottom: 2px solid #eee; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .numeric { text-align: right; }
            .highlight { font-weight: bold; color: #000; }
          </style>
        </head>
        <body>
          <h1>Payroll Summary</h1>
          <h2>Period: ${period}</h2>
          
          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-label">Total Work Hours</div>
              <div class="stat-value">${totalWorkHours.toFixed(2)}h</div>
            </div>
            <div class="stat-box" style="border-left: 1px solid #ddd;">
              <div class="stat-label">Total Break Time</div>
              <div class="stat-value">${totalBreakMinutes}m</div>
            </div>
            <div class="stat-box" style="border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
              <div class="stat-label">Total Correction</div>
              <div class="stat-value">${totalCorrectionMinutes}m</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Payable</div>
              <div class="stat-value" style="color: #2563EB;">${totalPayableHours.toFixed(2)}h</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th class="numeric">Total Work Hours</th>
                <th class="numeric">Break Time (min)</th>
                <th class="numeric">Correction (min)</th>
                <th class="numeric">Payable Hours</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.worker_name}</td>
                  <td class="numeric">${item.total_work_hours.toFixed(2)}</td>
                  <td class="numeric">${item.total_break_minutes}</td>
                  <td class="numeric">${item.total_correction_minutes}</td>
                  <td class="numeric highlight">${item.payable_hours.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const fileName = `Payroll_Report_${period.replace(' ', '_')}`;
    await exportToPDF(html, fileName);
  };

  const tableMinWidth = 900;

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
        {/* --- Top Toolbar: Navigator & Exports --- */}
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
              style={[styles.iconActionButton, { backgroundColor: theme.colors.success }]}
              onPress={handleExportExcel}
            >
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.iconActionText} fontType="bold">Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconActionButton, { backgroundColor: theme.colors.danger }]}
              onPress={handleExportPDF}
            >
              <Ionicons name="document-text-outline" size={20} color="white" />
              <Text style={styles.iconActionText} fontType="bold">PDF</Text>
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
