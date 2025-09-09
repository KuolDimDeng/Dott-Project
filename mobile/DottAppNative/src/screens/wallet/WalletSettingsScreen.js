import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';

export default function WalletSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    defaultProvider: 'MTN_MOMO',
    autoAcceptRequests: false,
    notifyOnReceive: true,
    notifyOnSend: true,
    requirePinForSend: false,
    dailyLimit: '1000',
    monthlyLimit: '10000',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await walletService.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await walletService.updateSettings(newSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleProviderChange = () => {
    Alert.alert(
      'Select Default Provider',
      'Choose your preferred mobile money provider',
      [
        { text: 'MTN Mobile Money', onPress: () => updateSetting('defaultProvider', 'MTN_MOMO') },
        { text: 'M-Pesa', onPress: () => updateSetting('defaultProvider', 'MPESA') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDailyLimitChange = () => {
    Alert.prompt(
      'Daily Transfer Limit',
      'Enter your daily transfer limit in USD',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (value) => {
            if (value && !isNaN(value)) {
              updateSetting('dailyLimit', value);
            }
          },
        },
      ],
      'plain-text',
      settings.dailyLimit
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Wallet Cache',
      'This will clear all cached wallet data. You will need to sync again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await walletService.clearCache();
            setLoading(false);
            Alert.alert('Success', 'Wallet cache cleared');
          },
        },
      ]
    );
  };

  const handleExportTransactions = async () => {
    Alert.alert(
      'Export Transactions',
      'Export your transaction history to CSV?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setLoading(true);
            try {
              await walletService.exportTransactions();
              Alert.alert('Success', 'Transactions exported successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to export transactions');
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Provider Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider Settings</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleProviderChange}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Default Provider</Text>
              <Text style={styles.settingDescription}>
                {settings.defaultProvider === 'MTN_MOMO' ? 'MTN Mobile Money' : 'M-Pesa'}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Require PIN for Transfers</Text>
              <Text style={styles.settingDescription}>
                Add extra security for sending money
              </Text>
            </View>
            <Switch
              value={settings.requirePinForSend}
              onValueChange={(value) => updateSetting('requirePinForSend', value)}
              trackColor={{ false: '#e5e7eb', true: '#86efac' }}
              thumbColor={settings.requirePinForSend ? '#047857' : '#f3f4f6'}
            />
          </View>

          <TouchableOpacity style={styles.settingRow} onPress={handleDailyLimitChange}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Transfer Limit</Text>
              <Text style={styles.settingDescription}>${settings.dailyLimit}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notify on Receive</Text>
              <Text style={styles.settingDescription}>
                Get notified when you receive money
              </Text>
            </View>
            <Switch
              value={settings.notifyOnReceive}
              onValueChange={(value) => updateSetting('notifyOnReceive', value)}
              trackColor={{ false: '#e5e7eb', true: '#86efac' }}
              thumbColor={settings.notifyOnReceive ? '#047857' : '#f3f4f6'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notify on Send</Text>
              <Text style={styles.settingDescription}>
                Get confirmation when money is sent
              </Text>
            </View>
            <Switch
              value={settings.notifyOnSend}
              onValueChange={(value) => updateSetting('notifyOnSend', value)}
              trackColor={{ false: '#e5e7eb', true: '#86efac' }}
              thumbColor={settings.notifyOnSend ? '#047857' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Transfer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer Requests</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Accept from Contacts</Text>
              <Text style={styles.settingDescription}>
                Automatically accept requests from saved contacts
              </Text>
            </View>
            <Switch
              value={settings.autoAcceptRequests}
              onValueChange={(value) => updateSetting('autoAcceptRequests', value)}
              trackColor={{ false: '#e5e7eb', true: '#86efac' }}
              thumbColor={settings.autoAcceptRequests ? '#047857' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportTransactions}>
            <Icon name="download-outline" size={20} color="#047857" />
            <Text style={styles.actionButtonText}>Export Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleClearCache}
          >
            <Icon name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, styles.dangerText]}>
              Clear Cache
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Wallet FAQ</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Contact Support</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#047857" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  section: {
    backgroundColor: 'white',
    marginBottom: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#047857',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#047857',
    marginLeft: 8,
  },
  dangerButton: {
    borderColor: '#ef4444',
  },
  dangerText: {
    color: '#ef4444',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});