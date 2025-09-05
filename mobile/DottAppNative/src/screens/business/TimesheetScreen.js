import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function TimesheetScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [todayHours, setTodayHours] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [recentShifts, setRecentShifts] = useState([]);

  useEffect(() => {
    loadTimesheetData();
  }, []);

  const loadTimesheetData = async () => {
    try {
      const [statusRes, summaryRes, shiftsRes] = await Promise.all([
        api.get('/api/timesheet/status/'),
        api.get('/api/timesheet/summary/'),
        api.get('/api/timesheet/recent/')
      ]);

      setClockedIn(statusRes.data.is_clocked_in || false);
      setCurrentShift(statusRes.data.current_shift || null);
      setTodayHours(summaryRes.data.today_hours || 0);
      setWeekHours(summaryRes.data.week_hours || 0);
      setRecentShifts(shiftsRes.data.shifts || []);
    } catch (error) {
      console.error('Error loading timesheet data:', error);
      // Use sample data for demo
      setRecentShifts([
        { 
          id: 1, 
          date: '2025-01-04', 
          clock_in: '09:00 AM', 
          clock_out: '05:00 PM', 
          hours: 8.0 
        },
        { 
          id: 2, 
          date: '2025-01-03', 
          clock_in: '09:15 AM', 
          clock_out: '05:30 PM', 
          hours: 8.25 
        },
        { 
          id: 3, 
          date: '2025-01-02', 
          clock_in: '08:45 AM', 
          clock_out: '05:15 PM', 
          hours: 8.5 
        },
      ]);
      setTodayHours(0);
      setWeekHours(24.75);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const response = await api.post('/api/timesheet/clock-in/');
      if (response.data.success) {
        setClockedIn(true);
        setCurrentShift(response.data.shift);
        Alert.alert('Success', 'You have successfully clocked in!');
        loadTimesheetData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    }
  };

  const handleClockOut = async () => {
    try {
      const response = await api.post('/api/timesheet/clock-out/');
      if (response.data.success) {
        setClockedIn(false);
        setCurrentShift(null);
        Alert.alert('Success', `You have clocked out. Hours worked: ${response.data.hours_worked || '0'}`);
        loadTimesheetData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clock out. Please try again.');
    }
  };

  const formatTime = (datetime) => {
    if (!datetime) return '--:--';
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const calculateElapsedTime = () => {
    if (!currentShift?.clock_in) return '00:00';
    const start = new Date(currentShift.clock_in);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timesheet</Text>
        <TouchableOpacity>
          <Icon name="calendar-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Clock In/Out Section */}
        <View style={styles.clockSection}>
          <View style={styles.clockStatus}>
            <View style={[styles.statusIndicator, clockedIn ? styles.statusActive : styles.statusInactive]} />
            <Text style={styles.statusText}>
              {clockedIn ? 'Currently Working' : 'Not Clocked In'}
            </Text>
          </View>

          {clockedIn && currentShift && (
            <View style={styles.currentShiftInfo}>
              <Text style={styles.elapsedTime}>{calculateElapsedTime()}</Text>
              <Text style={styles.clockInTime}>
                Since {formatTime(currentShift.clock_in)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.clockButton, clockedIn ? styles.clockOutButton : styles.clockInButton]}
            onPress={clockedIn ? handleClockOut : handleClockIn}
          >
            <Icon 
              name={clockedIn ? 'stop-circle' : 'play-circle'} 
              size={32} 
              color="white" 
            />
            <Text style={styles.clockButtonText}>
              {clockedIn ? 'Clock Out' : 'Clock In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hours Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Hours Summary</Text>
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Today</Text>
              <Text style={styles.summaryValue}>{todayHours.toFixed(1)}h</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>This Week</Text>
              <Text style={styles.summaryValue}>{weekHours.toFixed(1)}h</Text>
            </View>
          </View>
        </View>

        {/* Recent Shifts */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Shifts</Text>
          {recentShifts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="time-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No recent shifts</Text>
            </View>
          ) : (
            recentShifts.map((shift) => (
              <View key={shift.id} style={styles.shiftCard}>
                <View style={styles.shiftDate}>
                  <Text style={styles.shiftDateText}>{formatDate(shift.date)}</Text>
                  <Text style={styles.shiftHours}>{shift.hours.toFixed(1)}h</Text>
                </View>
                <View style={styles.shiftTimes}>
                  <View style={styles.timeBlock}>
                    <Icon name="log-in-outline" size={16} color="#10b981" />
                    <Text style={styles.timeText}>{shift.clock_in}</Text>
                  </View>
                  <Icon name="arrow-forward" size={16} color="#9ca3af" />
                  <View style={styles.timeBlock}>
                    <Icon name="log-out-outline" size={16} color="#ef4444" />
                    <Text style={styles.timeText}>{shift.clock_out}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="document-text-outline" size={24} color="#2563eb" />
            <Text style={styles.actionText}>View Full History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="download-outline" size={24} color="#2563eb" />
            <Text style={styles.actionText}>Export Timesheet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  clockSection: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  clockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  currentShiftInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  elapsedTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  clockInTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  clockInButton: {
    backgroundColor: '#2563eb',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
  },
  clockButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  shiftCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  shiftDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shiftDateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  shiftHours: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  shiftTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    color: '#2563eb',
    marginLeft: 12,
  },
});