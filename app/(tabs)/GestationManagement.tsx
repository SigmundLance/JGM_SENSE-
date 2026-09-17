import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebaseConfig';

export type PregnancyStatus = 'Confirmed' | 'Pending' | 'Failed' | 'High Risk';

export interface GestationRecord {
  id?: string;
  name: string;
  pregnancyStatus: PregnancyStatus;
  inseminationDate: string; // "YYYY-MM-DD"
  movementDate: string; // "YYYY-MM-DD"
  estimatedFarrowDate: string; // "YYYY-MM-DD"
  overdueDays?: number;
}

// new Date("YYYY-MM-DD") parses as UTC midnight, not local midnight -
// same issue fixed in dashboard.tsx. Parse the components and construct
// via the local-time Date constructor instead.
const parseISODateLocal = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

// toISOString() converts to UTC on the way out, which would re-introduce
// the same mismatch in reverse - it shifts dates by a day in positive-
// UTC-offset zones even when the parse above is done correctly. Format
// from local getters instead so parse and output use the same clock.
const toISODateStringLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateFarrowDate = (inseminationDateStr: string): string => {
  const date = parseISODateLocal(inseminationDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 114);
  return toISODateStringLocal(date);
};

const calculateMoveDate = (inseminationDateStr: string): string => {
  const date = parseISODateLocal(inseminationDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 107);
  return toISODateStringLocal(date);
};

// Masks free digit entry into YYYY-MM-DD as the user types, inserting
// dashes after the 4th and 6th digit. `previousFormatted` is the field's
// current (already-masked) value, used to detect a backspace that only
// removed an auto-inserted dash (native char count shrank but digit
// count didn't) - in that case we also drop the trailing digit so
// backspacing near a separator always removes a digit instead of
// silently doing nothing.
const formatDateInput = (rawText: string, previousFormatted: string): string => {
  const rawDigits = rawText.replace(/\D/g, '');
  const prevDigits = previousFormatted.replace(/\D/g, '');

  let digits = rawDigits;
  if (rawText.length < previousFormatted.length && rawDigits.length === prevDigits.length) {
    digits = digits.slice(0, -1);
  }
  digits = digits.slice(0, 8);

  let formatted = digits.slice(0, 4);
  if (digits.length > 4) formatted += '-' + digits.slice(4, 6);
  if (digits.length > 6) formatted += '-' + digits.slice(6, 8);
  return formatted;
};

// True only for a complete, calendar-valid YYYY-MM-DD (rejects month
// 00/13+, day 32+, Feb 30, etc. - leap years handled via the "day 0 of
// next month" trick).
const isValidCalendarDate = (formatted: string): boolean => {
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
};

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return '';
  const date = parseISODateLocal(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function GestationManagement() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [pigRecords, setPigRecords] = useState<GestationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPig, setExpandedPig] = useState<string | null>(null);
  const [editingPigId, setEditingPigId] = useState<string | null>(null);
  const [showAlertBanner, setShowAlertBanner] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form edit states
  const [editName, setEditName] = useState('');
  const [editInsDate, setEditInsDate] = useState('');
  const [editMoveDate, setEditMoveDate] = useState('');
  const [editFarrowDate, setEditFarrowDate] = useState('');
  const [editStatus, setEditStatus] = useState<PregnancyStatus>('Pending');

  // Modal new record state
  const [newName, setNewName] = useState('');
  const [newInsDate, setNewInsDate] = useState('');
  const [newMoveDate, setNewMoveDate] = useState('');

  useEffect(() => {
    const recordsRef = collection(db, 'Gestation_Records');
    const unsubscribe = onSnapshot(
      recordsRef,
      (snapshot) => {
        const records: GestationRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<GestationRecord, 'id'>;
          return {
            id: docSnap.id,
            ...data,
          };
        });
        setPigRecords(records);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const startEditing = (pig: GestationRecord) => {
    if (!pig.id) return;
    setEditingPigId(pig.id);
    setEditName(pig.name);
    setEditInsDate(pig.inseminationDate);
    setEditMoveDate(pig.movementDate);
    setEditFarrowDate(pig.estimatedFarrowDate);
    setEditStatus(pig.pregnancyStatus);
  };

  const handleSaveEdit = async (id: string) => {
    if (!isValidCalendarDate(editInsDate)) return;

    try {
      const pigRef = doc(db, 'Gestation_Records', id);
      await updateDoc(pigRef, {
        name: editName,
        inseminationDate: editInsDate,
        movementDate: editMoveDate,
        estimatedFarrowDate: editFarrowDate || calculateFarrowDate(editInsDate),
        pregnancyStatus: editStatus,
      });

      setEditingPigId(null);
      showNotification('Pig record updated 🐷');
    } catch (error) {
      console.error('Error updating document: ', error);
      showNotification('Failed to update record');
    }
  };

  const handleQuickStatusUpdate = async (id: string, newStatus: PregnancyStatus) => {
    try {
      const pigRef = doc(db, 'Gestation_Records', id);
      await updateDoc(pigRef, { pregnancyStatus: newStatus });
      showNotification(
        newStatus === 'Confirmed'
          ? 'Pig confirmed pregnant 🐷'
          : `Status updated: ${newStatus}`
      );
    } catch (error) {
      console.error('Error updating status: ', error);
    }
  };

  const confirmDeleteRecord = (id: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this gestation record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteRecord(id),
        },
      ]
    );
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'Gestation_Records', id));
      if (expandedPig === id) setExpandedPig(null);
      showNotification('Record deleted');
    } catch (error) {
      console.error('Error deleting document: ', error);
    }
  };

  const isNewInsDateValid = isValidCalendarDate(newInsDate);

  const handleAddNewRecord = async () => {
    if (!newName.trim() || !isNewInsDateValid) return;

    const estimatedFarrowDate = calculateFarrowDate(newInsDate);
    const movementDate = newMoveDate || calculateMoveDate(newInsDate);

    try {
      await addDoc(collection(db, 'Gestation_Records'), {
        name: newName,
        pregnancyStatus: 'Pending',
        inseminationDate: newInsDate,
        movementDate: movementDate,
        estimatedFarrowDate: estimatedFarrowDate,
      });

      setNewName('');
      setNewInsDate('');
      setNewMoveDate('');
      setModalVisible(false);
      showNotification('Sow record saved 🐷');
    } catch (error) {
      console.error('Error adding document: ', error);
      showNotification('Error saving sow record');
    }
  };

  const overduePigs = pigRecords.filter(
    (p) => p.overdueDays && p.pregnancyStatus === 'Pending'
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.isDark ? '#1C1A1D' : '#FFF6F6' },
      ]}
    >
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      {/* Toast Notification */}
      {toastMessage && (
        <View style={[styles.toast, { top: Math.max(insets.top + 10, 20) }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 10, 20),
              paddingBottom: Math.max(insets.bottom + 180, 190),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Title */}
          <View style={styles.header}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.isDark ? '#FFF' : '#2D1F21' },
              ]}
            >
              Sow Gestation{'\n'}Management
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.isDark ? '#AAA' : '#8E7C80' },
              ]}
            >
              Track sow pregnancy records and expected farrowing dates.
            </Text>
          </View>

          {/* Decorative Illustration */}
          <Image
            source={require('./Pictures/Pig.png')}
            style={styles.mainIllustration}
            resizeMode="contain"
          />

          {/* Overdue Attention Banner */}
          {showAlertBanner && overduePigs.length > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertHeaderRow}>
                <View style={styles.bellIconBox}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color="#D97706"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {overduePigs.length} pregnancy checks need attention
                  </Text>
                  <Text style={styles.alertSubtitle}>
                    {overduePigs.length} are overdue. Reminders triggered 24–30
                    days post-insemination.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowAlertBanner(false)}>
                  <Ionicons name="close" size={18} color="#A08C90" />
                </TouchableOpacity>
              </View>

              <View style={styles.alertChipsRow}>
                {overduePigs.map((p) => (
                  <View key={p.id} style={styles.alertTag}>
                    <Text style={styles.alertTagText}>
                      {p.name} · {p.overdueDays}d overdue
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#C27581"
              style={{ marginTop: 40 }}
            />
          ) : (
            /* Cards List */
            <View style={styles.listContainer}>
              {pigRecords.map((pig) => {
                if (!pig.id) return null;
                const isExpanded = expandedPig === pig.id;
                const isEditing = editingPigId === pig.id;
                const isConfirmed = pig.pregnancyStatus === 'Confirmed';
                const isPending = pig.pregnancyStatus === 'Pending';

                return (
                  <View
                    key={pig.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.isDark ? '#2A2528' : '#FFFFFF',
                      },
                      isExpanded && styles.cardExpanded,
                    ]}
                  >
                    {/* Card Header */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.cardHeader}
                      onPress={() => {
                        setExpandedPig(isExpanded ? null : pig.id!);
                        if (isEditing) setEditingPigId(null);
                      }}
                    >
                      <View style={styles.cardHeaderLeft}>
                        <View style={styles.avatarContainer}>
                          <Image
                            source={require('./Pictures/Pig.png')}
                            style={styles.avatarIcon}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.pigInfoContainer}>
                          <Text
                            style={[
                              styles.pigName,
                              { color: theme.isDark ? '#FFF' : '#2D1F21' },
                            ]}
                          >
                            {pig.name}
                          </Text>

                          <View style={styles.badgeRow}>
                            <View
                              style={[
                                styles.badge,
                                {
                                  backgroundColor: isConfirmed
                                    ? '#E6F7ED'
                                    : '#FFF3E0',
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.badgeDot,
                                  {
                                    backgroundColor: isConfirmed
                                      ? '#2E7D32'
                                      : '#E65100',
                                  },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.badgeText,
                                  {
                                    color: isConfirmed ? '#2E7D32' : '#E65100',
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {pig.pregnancyStatus}
                              </Text>
                            </View>

                            {pig.overdueDays && isPending && (
                              <View style={styles.overdueBadge}>
                                <Text style={styles.overdueBadgeText}>
                                  Overdue {pig.overdueDays}d
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardHeaderRight}>
                        <Text style={styles.farrowingLabel}>
                          {isPending ? 'PREGNANCY CHECK' : 'FARROWING'}
                        </Text>
                        <Text
                          style={[
                            styles.farrowingDate,
                            { color: theme.isDark ? '#FFF' : '#2D1F21' },
                          ]}
                        >
                          {formatDateForDisplay(pig.estimatedFarrowDate)}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#8E7C80"
                          style={{ alignSelf: 'flex-end', marginTop: 2 }}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Card Body */}
                    {isExpanded && (
                      <View style={styles.cardBody}>
                        <View
                          style={[
                            styles.divider,
                            {
                              backgroundColor: theme.isDark
                                ? '#3D3538'
                                : '#F0E6E6',
                            },
                          ]}
                        />

                        <View style={styles.bodyTitleRow}>
                          <Text style={styles.sectionHeaderTitle}>
                            PIG INFORMATION
                          </Text>
                          {!isEditing && (
                            <View style={styles.actionIconRow}>
                              <TouchableOpacity
                                style={styles.iconCircleBtn}
                                onPress={() => startEditing(pig)}
                              >
                                <Ionicons
                                  name="pencil-outline"
                                  size={15}
                                  color="#A05C68"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.iconCircleBtn}
                                onPress={() => confirmDeleteRecord(pig.id!)}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={15}
                                  color="#D32F2F"
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>

                        {/* VIEW MODE */}
                        {!isEditing ? (
                          <>
                            {pig.overdueDays && isPending && (
                              <View style={styles.overdueNoticeBox}>
                                <Text style={styles.overdueNoticeTitle}>
                                  Pregnancy check overdue by {pig.overdueDays}{' '}
                                  days
                                </Text>
                                <View style={styles.overdueNoticeBtns}>
                                  <TouchableOpacity
                                    style={styles.confirmPillBtn}
                                    onPress={() =>
                                      handleQuickStatusUpdate(
                                        pig.id!,
                                        'Confirmed'
                                      )
                                    }
                                  >
                                    <Text style={styles.confirmPillText}>
                                      Confirmed Pregnant
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.secondaryPillBtn}
                                    onPress={() =>
                                      handleQuickStatusUpdate(pig.id!, 'Failed')
                                    }
                                  >
                                    <Text style={styles.secondaryPillText}>
                                      Not Pregnant
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}

                            <View style={styles.gridContainer}>
                              <View style={styles.gridColumn}>
                                <Text style={styles.fieldLabel}>Name</Text>
                                <Text
                                  style={[
                                    styles.fieldValue,
                                    {
                                      color: theme.isDark ? '#FFF' : '#2D1F21',
                                    },
                                  ]}
                                >
                                  {pig.name}
                                </Text>

                                <Text
                                  style={[styles.fieldLabel, { marginTop: 15 }]}
                                >
                                  Pregnancy Status
                                </Text>
                                <View
                                  style={[
                                    styles.badge,
                                    {
                                      backgroundColor: isConfirmed
                                        ? '#E6F7ED'
                                        : '#FFF3E0',
                                      alignSelf: 'flex-start',
                                      marginTop: 4,
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.badgeDot,
                                      {
                                        backgroundColor: isConfirmed
                                          ? '#2E7D32'
                                          : '#E65100',
                                      },
                                    ]}
                                  />
                                  <Text
                                    style={[
                                      styles.badgeText,
                                      {
                                        color: isConfirmed
                                          ? '#2E7D32'
                                          : '#E65100',
                                      },
                                    ]}
                                  >
                                    {pig.pregnancyStatus}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.gridColumn}>
                                <Text style={styles.fieldLabel}>
                                  Insemination Date
                                </Text>
                                <Text
                                  style={[
                                    styles.fieldValue,
                                    {
                                      color: theme.isDark ? '#FFF' : '#2D1F21',
                                    },
                                  ]}
                                >
                                  {formatDateForDisplay(pig.inseminationDate)}
                                </Text>

                                <Text
                                  style={[styles.fieldLabel, { marginTop: 15 }]}
                                >
                                  Movement Date
                                </Text>
                                <Text
                                  style={[
                                    styles.fieldValue,
                                    {
                                      color: theme.isDark ? '#FFF' : '#2D1F21',
                                    },
                                  ]}
                                >
                                  {formatDateForDisplay(pig.movementDate)}
                                </Text>
                              </View>
                            </View>

                            <View style={{ marginTop: 15 }}>
                              <Text style={styles.fieldLabel}>
                                Estimated Farrowing Date
                              </Text>
                              <Text style={styles.farrowingHighlight}>
                                {formatDateForDisplay(pig.estimatedFarrowDate)}
                              </Text>
                            </View>
                          </>
                        ) : (
                          /* EDIT MODE FORM */
                          <View style={styles.editFormContainer}>
                            <View style={styles.inputWrapper}>
                              <Text style={styles.inputLabel}>Pig Name</Text>
                              <TextInput
                                style={[
                                  styles.modalInput,
                                  {
                                    color: theme.isDark ? '#FFF' : '#2D1F21',
                                    backgroundColor: theme.isDark
                                      ? '#352F32'
                                      : '#F9F5F5',
                                  },
                                ]}
                                value={editName}
                                onChangeText={setEditName}
                              />
                            </View>

                            <View style={styles.inputWrapper}>
                              <Text style={styles.inputLabel}>
                                Insemination Date (YYYY-MM-DD)
                              </Text>
                              <TextInput
                                style={[
                                  styles.modalInput,
                                  {
                                    color: theme.isDark ? '#FFF' : '#2D1F21',
                                    backgroundColor: theme.isDark
                                      ? '#352F32'
                                      : '#F9F5F5',
                                  },
                                ]}
                                keyboardType="number-pad"
                                maxLength={10}
                                value={editInsDate}
                                onChangeText={(val) => {
                                  const formatted = formatDateInput(val, editInsDate);
                                  setEditInsDate(formatted);
                                  setEditFarrowDate(calculateFarrowDate(formatted));
                                }}
                              />
                              {editInsDate.replace(/-/g, '').length === 8 &&
                                !isValidCalendarDate(editInsDate) && (
                                  <Text style={styles.dateErrorText}>Enter a valid date</Text>
                                )}
                            </View>

                            <View style={styles.inputWrapper}>
                              <Text style={styles.inputLabel}>
                                Movement Date (YYYY-MM-DD)
                              </Text>
                              <TextInput
                                style={[
                                  styles.modalInput,
                                  {
                                    color: theme.isDark ? '#FFF' : '#2D1F21',
                                    backgroundColor: theme.isDark
                                      ? '#352F32'
                                      : '#F9F5F5',
                                  },
                                ]}
                                value={editMoveDate}
                                onChangeText={setEditMoveDate}
                              />
                            </View>

                            <Text style={[styles.fieldLabel, { marginTop: 5 }]}>
                              Pregnancy Status
                            </Text>
                            <View style={styles.statusChipGrid}>
                              <TouchableOpacity
                                style={[
                                  styles.statusChip,
                                  editStatus === 'Pending' &&
                                    styles.statusChipActiveWaiting,
                                ]}
                                onPress={() => setEditStatus('Pending')}
                              >
                                <View
                                  style={[
                                    styles.badgeDot,
                                    { backgroundColor: '#E65100' },
                                  ]}
                                />
                                <Text style={styles.chipText}>Pending</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.statusChip,
                                  editStatus === 'Confirmed' &&
                                    styles.statusChipActiveConfirmed,
                                ]}
                                onPress={() => setEditStatus('Confirmed')}
                              >
                                <View
                                  style={[
                                    styles.badgeDot,
                                    { backgroundColor: '#2E7D32' },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.chipText,
                                    editStatus === 'Confirmed' && {
                                      color: '#FFF',
                                    },
                                  ]}
                                >
                                  Confirmed
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.statusChip,
                                  editStatus === 'Failed' &&
                                    styles.statusChipActiveGray,
                                ]}
                                onPress={() => setEditStatus('Failed')}
                              >
                                <Text style={styles.chipText}>Failed</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.modalActions}>
                              <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setEditingPigId(null)}
                              >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.saveChangesBtn,
                                  !isValidCalendarDate(editInsDate) && { opacity: 0.5 },
                                ]}
                                onPress={() => handleSaveEdit(pig.id!)}
                                disabled={!isValidCalendarDate(editInsDate)}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color="#FFF"
                                />
                                <Text style={styles.saveChangesBtnText}>
                                  Save Changes
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: Math.max(insets.bottom + 80, 90) },
        ]}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add New Record Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.isDark ? '#2A2528' : '#FFF' },
              ]}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.isDark ? '#FFF' : '#2D1F21' },
                  ]}
                >
                  Add New Record
                </Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#8E7C80" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Pig Name / ID</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: theme.isDark ? '#FFF' : '#2D1F21',
                        backgroundColor: theme.isDark ? '#352F32' : '#F9F5F5',
                      },
                    ]}
                    placeholder="e.g. Sow #104"
                    placeholderTextColor="#A08C90"
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>
                    Insemination Date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: theme.isDark ? '#FFF' : '#2D1F21',
                        backgroundColor: theme.isDark ? '#352F32' : '#F9F5F5',
                      },
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#A08C90"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={newInsDate}
                    onChangeText={(val) => {
                      const formatted = formatDateInput(val, newInsDate);
                      setNewInsDate(formatted);
                      setNewMoveDate(calculateMoveDate(formatted));
                    }}
                  />
                  {newInsDate.replace(/-/g, '').length === 8 && !isNewInsDateValid && (
                    <Text style={styles.dateErrorText}>Enter a valid date</Text>
                  )}
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>
                    Movement Date (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: theme.isDark ? '#FFF' : '#2D1F21',
                        backgroundColor: theme.isDark ? '#352F32' : '#F9F5F5',
                      },
                    ]}
                    placeholder="Auto-calculated (+107 days)"
                    placeholderTextColor="#A08C90"
                    value={newMoveDate}
                    onChangeText={setNewMoveDate}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!newName.trim() || !isNewInsDateValid) && { opacity: 0.5 },
                  ]}
                  onPress={handleAddNewRecord}
                  disabled={!newName.trim() || !isNewInsDateValid}
                >
                  <Text style={styles.submitBtnText}>Save Sow Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: '#322F30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 25,
  },
  header: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    lineHeight: 40,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 20,
    lineHeight: 18,
  },
  mainIllustration: {
    width: '100%',
    height: 220,
    alignSelf: 'center',
    marginVertical: 0,
    marginTop: -10,
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bellIconBox: {
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  alertChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  alertTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  listContainer: {
    gap: 12,
    marginTop: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardExpanded: {
    borderColor: '#C27581',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7EBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    width: 40,
    height: 40,
  },
  pigInfoContainer: {
    gap: 4,
  },
  pigName: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  overdueBadgeText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  farrowingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E7C80',
    letterSpacing: 0.5,
  },
  farrowingDate: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardBody: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  bodyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E7C80',
    letterSpacing: 0.8,
  },
  actionIconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4ECEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  overdueNoticeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  overdueNoticeBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmPillBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  confirmPillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryPillBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  secondaryPillText: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridColumn: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#8E7C80',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  farrowingHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#C27581',
    marginTop: 2,
  },
  editFormContainer: {
    gap: 10,
  },
  inputWrapper: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    color: '#8E7C80',
    fontWeight: '600',
  },
  modalInput: {
    height: 42,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  dateErrorText: {
    fontSize: 11,
    color: '#D43C4A',
    fontWeight: '600',
  },
  statusChipGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    gap: 4,
  },
  statusChipActiveWaiting: {
    backgroundColor: '#FFEDD5',
  },
  statusChipActiveConfirmed: {
    backgroundColor: '#2E7D32',
  },
  statusChipActiveGray: {
    backgroundColor: '#9CA3AF',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#8E7C80',
    fontSize: 13,
    fontWeight: '600',
  },
  saveChangesBtn: {
    backgroundColor: '#C27581',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  saveChangesBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C27581',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  modalForm: {
    gap: 12,
  },
  submitBtn: {
    backgroundColor: '#C27581',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});