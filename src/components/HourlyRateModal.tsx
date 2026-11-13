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
import { useTranslation } from 'react-i18next';
import { Text } from './Themed';
import { Card } from './Card';
import { theme } from '../theme';
import { HourlyRate } from '../types';
import { fetchHourlyRateHistory, insertHourlyRate } from '../services/hourlyRates';
import { useSession } from '~/context/AuthContext';
import CrossPlatformDatePicker from './CrossPlatformDatePicker';
import { getCurrencySymbol } from '../utils/currency';

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
  const { t } = useTranslation();
  const { userCompanyCountry } = useSession();
  const currency = getCurrencySymbol(userCompanyCountry);

  const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Effective from is always the 1st of a month
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
      Toast.show({ type: 'error', text1: t('manager.hourlyRate.error'), text2: t('manager.hourlyRate.couldNotLoadHistory') });
    } finally {
      setLoadingHistory(false);
    }
  }, [employeeId, t]);

  useEffect(() => {
    if (visible) {
      loadHistory();
      setNewRate('');
    }
  }, [visible, loadHistory]);

  // Update effectiveFrom after history loads
  useEffect(() => {
    if (visible && !loadingHistory) {
      // Always allow from current month (can update current rate or add future rates)
      const minDate = moment().startOf('month').toDate();
      setEffectiveFrom(minDate);
    }
  }, [visible, loadingHistory, history.length]);

  const now = new Date();
  const currentRate = history.find(r => new Date(r.effective_from) <= now) ?? null;
  const isFutureRate = (r: HourlyRate) => new Date(r.effective_from) > now;
  const isCurrentRate = (r: HourlyRate) => r.id === currentRate?.id;

  const handleSave = async () => {
    const parsed = parseFloat(newRate.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Toast.show({ type: 'error', text1: t('manager.hourlyRate.invalidRate'), text2: t('manager.hourlyRate.enterPositiveNumber') });
      return;
    }

    // Minimum date is always current month (can update current rate, all past months locked)
    const chosenMonth = moment(effectiveFrom).startOf('month');
    const minimumMonth = moment().startOf('month');
    
    if (chosenMonth.isBefore(minimumMonth)) {
      Toast.show({ 
        type: 'error', 
        text1: t('manager.hourlyRate.invalidMonth'), 
        text2: t('manager.hourlyRate.cannotSetPastRates')
      });
      return;
    }

    // Always store as 1st of the chosen month at midnight UTC
    const effectiveFromUtc = chosenMonth.utc(true).toISOString();

    setSaving(true);
    try {
      await insertHourlyRate(employeeId, companyId, parsed, effectiveFromUtc);
      Toast.show({
        type: 'success',
        text1: t('manager.hourlyRate.rateSaved'),
        text2: `${currency}${parsed.toFixed(2)}/h ${t('manager.hourlyRate.from')} ${chosenMonth.format('MMMM YYYY')}`,
      });
      setNewRate('');
      await loadHistory();
      // Reload will trigger useEffect to set proper minimum date
    } catch (e: any) {
      Toast.show({ type: 'error', text1: t('manager.hourlyRate.saveFailed'), text2: e?.message ?? t('manager.hourlyRate.tryAgain') });
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
                <Text style={styles.title} fontType="bold">{t('manager.hourlyRate.title')}</Text>
                <Text style={styles.subtitle}>{employeeName}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.bodyText} />
              </TouchableOpacity>
            </View>

            {/* Current rate banner */}
            <View style={styles.currentRateRow}>
              <Text style={styles.currentRateLabel}>{t('manager.hourlyRate.currentRate')}</Text>
              <View style={currentRate ? styles.currentRateBadge : styles.currentRateEmpty}>
                <Text style={currentRate ? styles.currentRateValue : styles.currentRateNone} fontType="bold">
                  {currentRate ? `${currency}${currentRate.hourly_rate.toFixed(2)}/h` : t('manager.hourlyRate.notSet')}
                </Text>
              </View>
            </View>

            {/* History */}
            <Text style={styles.sectionLabel} fontType="bold">{t('manager.hourlyRate.rateHistory')}</Text>
            {loadingHistory ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>{t('manager.hourlyRate.noRatesYet')}</Text>
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
                        ? `${t('manager.hourlyRate.from')} ${moment(r.effective_from).format('MMMM YYYY')} (${t('manager.hourlyRate.upcoming')})`
                        : `${t('manager.hourlyRate.from')} ${moment(r.effective_from).format('MMMM YYYY')}`}
                    </Text>
                    </View>
                    <View style={[
                      styles.badge,
                      isFutureRate(r) ? styles.badgeFuture
                        : isCurrentRate(r) ? styles.badgeCurrent
                        : styles.badgePast,
                    ]}>
                      <Text style={styles.badgeText}>
                        {isFutureRate(r) ? t('manager.hourlyRate.upcoming') : isCurrentRate(r) ? t('manager.hourlyRate.current') : t('manager.hourlyRate.past')}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.divider} />

            {/* New rate form */}
            <Text style={styles.sectionLabel} fontType="bold">{t('manager.hourlyRate.setNewRate')}</Text>
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
                <Text style={styles.rateSuffix}>{t('manager.hourlyRate.perHour')}</Text>
              </View>
              <CrossPlatformDatePicker
                date={effectiveFrom}
                onDateChange={(date) => {
                  // Always snap to 1st of month
                  setEffectiveFrom(moment(date).startOf('month').toDate());
                }}
                minDate={moment().startOf('month').toDate()}
                filterDate={(date) => {
                  // Disable months before current month (web only)
                  const currentMonth = moment().startOf('month');
                  return moment(date).startOf('month').isSameOrAfter(currentMonth);
                }}
                mode="month"
              />
            </View>
            <Text style={styles.hint}>
              {t('manager.hourlyRate.currentMonthMutableHint')}
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText} fontType="medium">{t('manager.hourlyRate.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (saving || !newRate) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving || !newRate}
              >
                {saving
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text style={styles.saveButtonText} fontType="bold">{t('manager.hourlyRate.saveRate')}</Text>
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
