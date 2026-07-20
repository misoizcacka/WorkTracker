import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Toast from 'react-native-toast-message';
import { Text } from './Themed';
import { Card } from './Card';
import { theme } from '../theme';
import { HourlyRate } from '../types';
import { fetchHourlyRateHistory, insertHourlyRate } from '../services/hourlyRates';
import { useSession } from '~/context/AuthContext';
import CrossPlatformDatePicker from './CrossPlatformDatePicker';

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

interface HourlyRateModalProps {
  visible: boolean;
  onClose: () => void;
  employeeId: string;
  companyId: string;
  employeeName: string;
}

const HourlyRateModal: React.FC<HourlyRateModalProps> = ({
  visible, onClose, employeeId, companyId, employeeName,
}) => {
  const { userCompanyCountry } = useSession();
  const currency = getCurrencySymbol(userCompanyCountry);

  const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Effective from is always the 1st of a month — minimum is next month
  const nextMonthStart = () => {
    return moment().add(1, 'month').startOf('month').toDate();
  };

  const [history, setHistory] = useState<HourlyRate[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState<Date>(nextMonthStart());

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchHourlyRateHistory(employeeId);
      setHistory(data);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load rate history.' });
    } finally {
      setLoadingHistory(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (visible) {
      loadHistory();
      setNewRate('');
      setEffectiveFrom(nextMonthStart());
    }
  }, [visible, loadHistory]);

  const now = new Date();
  const currentRate = history.find(r => new Date(r.effective_from) <= now) ?? null;
  const isFutureRate = (r: HourlyRate) => new Date(r.effective_from) > now;
  const isCurrentRate = (r: HourlyRate) => r.id === currentRate?.id;

  const handleSave = async () => {
    const parsed = parseFloat(newRate.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Rate', text2: 'Please enter a positive number.' });
      return;
    }

    // Enforce next month minimum — rate changes only take effect at the start of a pay period
    const chosenMonth = moment(effectiveFrom).startOf('month');
    const nextMonth = moment().add(1, 'month').startOf('month');
    if (chosenMonth.isBefore(nextMonth)) {
      Toast.show({ type: 'error', text1: 'Invalid Month', text2: 'Rate changes can only start from next month onwards.' });
      return;
    }

    // Always store as 1st of the chosen month at midnight UTC
    const effectiveFromUtc = chosenMonth.utc(true).toISOString();

    setSaving(true);
    try {
      await insertHourlyRate(employeeId, companyId, parsed, effectiveFromUtc);
      Toast.show({
        type: 'success',
        text1: 'Rate Saved',
        text2: `${currency}${parsed.toFixed(2)}/h from ${chosenMonth.format('MMMM YYYY')}`,
      });
      setNewRate('');
      setEffectiveFrom(nextMonthStart());
      await loadHistory();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Save Failed', text2: e?.message ?? 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Card style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title} fontType="bold">Hourly Rate</Text>
                <Text style={styles.subtitle}>{employeeName}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.bodyText} />
              </TouchableOpacity>
            </View>

            {/* Current rate banner */}
            <View style={styles.currentRateRow}>
              <Text style={styles.currentRateLabel}>Current Rate</Text>
              <View style={currentRate ? styles.currentRateBadge : styles.currentRateEmpty}>
                <Text style={currentRate ? styles.currentRateValue : styles.currentRateNone} fontType="bold">
                  {currentRate ? `${currency}${currentRate.hourly_rate.toFixed(2)}/h` : 'Not set'}
                </Text>
              </View>
            </View>

            {/* History */}
            <Text style={styles.sectionLabel} fontType="bold">Rate History</Text>
            {loadingHistory ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>No rates set yet.</Text>
            ) : (
              <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
                {history.map((r) => (
                  <View key={r.id} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyRate} fontType="bold">
                        {currency}{r.hourly_rate.toFixed(2)}/h
                      </Text>
                      <Text style={styles.historyDate}>
                      {isFutureRate(r)
                        ? `From ${moment(r.effective_from).format('MMMM YYYY')} (upcoming)`
                        : `From ${moment(r.effective_from).format('MMMM YYYY')}`}
                    </Text>
                    </View>
                    <View style={[
                      styles.badge,
                      isFutureRate(r) ? styles.badgeFuture
                        : isCurrentRate(r) ? styles.badgeCurrent
                        : styles.badgePast,
                    ]}>
                      <Text style={styles.badgeText}>
                        {isFutureRate(r) ? 'Upcoming' : isCurrentRate(r) ? 'Current' : 'Past'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.divider} />

            {/* New rate form */}
            <Text style={styles.sectionLabel} fontType="bold">Set New Rate</Text>
            <View style={styles.formRow}>
              <View style={styles.rateInputWrapper}>
                <Text style={styles.currencyPrefix}>{currency}</Text>
                <TextInput
                  style={styles.rateInput}
                  placeholder="0.00"
                  value={newRate}
                  onChangeText={setNewRate}
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.disabledText}
                />
                <Text style={styles.rateSuffix}>/h</Text>
              </View>
              <CrossPlatformDatePicker
                date={effectiveFrom}
                onDateChange={(date) => {
                  // Clamp to next month minimum and always snap to 1st of month
                  const chosen = moment(date).startOf('month');
                  const min = moment().add(1, 'month').startOf('month');
                  setEffectiveFrom((chosen.isBefore(min) ? min : chosen).toDate());
                }}
                mode="month"
              />
            </View>
            <Text style={styles.hint}>
              Rate changes take effect from the 1st of the chosen month. Earliest allowed is next month.
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText} fontType="medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (saving || !newRate) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving || !newRate}
              >
                {saving
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text style={styles.saveButtonText} fontType="bold">Save Rate</Text>
                }
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { width: '90%', maxWidth: 500 },
  card: {
    padding: 0,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.cardBackground,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  title: { fontSize: theme.fontSizes.lg, color: theme.colors.headingText },
  subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText, marginTop: 2 },
  closeButton: {
    backgroundColor: theme.colors.pageBackground,
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  currentRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    backgroundColor: theme.colors.pageBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  currentRateLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText },
  currentRateBadge: {
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  currentRateEmpty: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: theme.colors.borderColor,
  },
  currentRateValue: { fontSize: theme.fontSizes.md, color: theme.colors.primary },
  currentRateNone: { fontSize: theme.fontSizes.sm, color: theme.colors.disabledText },
  sectionLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.bodyText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(1),
  },
  emptyText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.disabledText,
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(1),
  },
  historyScroll: { maxHeight: 180, paddingHorizontal: theme.spacing(3) },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  historyLeft: { flex: 1 },
  historyRate: { fontSize: theme.fontSizes.md, color: theme.colors.headingText },
  historyDate: { fontSize: theme.fontSizes.xs, color: theme.colors.bodyText, marginTop: 1 },
  badge: { borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  badgeCurrent: { backgroundColor: theme.colors.primaryMuted },
  badgeFuture: { backgroundColor: '#FEF3C7' },
  badgePast: { backgroundColor: theme.colors.pageBackground, borderWidth: 1, borderColor: theme.colors.borderColor },
  badgeText: { fontSize: 11, color: theme.colors.bodyText },
  divider: { height: 1, backgroundColor: theme.colors.borderColor, marginTop: theme.spacing(2) },
  formRow: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    alignItems: 'center',
  },
  rateInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(1.5),
    height: 44,
  },
  currencyPrefix: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText, marginRight: 4 },
  rateInput: { flex: 1, fontSize: theme.fontSizes.md, color: theme.colors.headingText, height: '100%' },
  rateSuffix: { fontSize: theme.fontSizes.sm, color: theme.colors.bodyText, marginLeft: 4 },
  hint: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.disabledText,
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(1),
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    padding: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderColor,
  },
  cancelButton: {
    flex: 1, height: 48, borderRadius: theme.radius.md,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.colors.pageBackground,
    borderWidth: 1, borderColor: theme.colors.borderColor,
  },
  cancelText: { fontSize: theme.fontSizes.md, color: theme.colors.bodyText },
  saveButton: {
    flex: 2, height: 48, borderRadius: theme.radius.md,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: 'white', fontSize: theme.fontSizes.md },
});

export default HourlyRateModal;
