/**
 * Recording Consent Modal Component
 * Handles consent for call/video recording with full legal compliance
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const RecordingConsentModal = ({
  visible,
  onAccept,
  onDecline,
  callerName,
  callType = 'voice',
  conversationId,
  sessionId
}) => {
  const { user } = useAuth();
  const [understood, setUnderstood] = useState(false);
  const [savePreference, setSavePreference] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legalText, setLegalText] = useState('');

  useEffect(() => {
    loadLegalText();
    checkSavedPreference();
  }, []);

  const loadLegalText = async () => {
    // Load region-specific legal text
    const region = await getUserRegion();
    const text = getLegalTextForRegion(region);
    setLegalText(text);
  };

  const checkSavedPreference = async () => {
    try {
      const preference = await AsyncStorage.getItem(`@consent:recording:${callerName}`);
      if (preference === 'always_accept') {
        // Auto-accept if user previously chose "always accept"
        handleAccept(true);
      } else if (preference === 'always_decline') {
        // Auto-decline if user previously chose "always decline"
        handleDecline(true);
      }
    } catch (error) {
      console.error('Error checking saved preference:', error);
    }
  };

  const getUserRegion = async () => {
    // Get user's region for compliance
    try {
      const region = await AsyncStorage.getItem('@user:region');
      return region || 'US';
    } catch {
      return 'US';
    }
  };

  const getLegalTextForRegion = (region) => {
    const legalTexts = {
      US: {
        title: 'Recording Consent Required',
        notice: 'This is a two-party consent state. Both parties must agree to recording.',
        rights: [
          'Recording will be stored securely for 30 days',
          'You can request deletion at any time',
          'Recording will not be shared without your explicit consent',
          'You have the right to decline recording',
          'Recording may be used for quality and training purposes'
        ]
      },
      EU: {
        title: 'GDPR Recording Consent',
        notice: 'Under GDPR, you have full control over your recorded data.',
        rights: [
          'Recording will be stored for maximum 30 days',
          'You have the right to access your recorded data',
          'You can request immediate deletion (right to be forgotten)',
          'Recording requires explicit consent and can be withdrawn',
          'Data will be processed only for stated purposes',
          'You have the right to data portability'
        ]
      },
      CA: {
        title: 'Recording Consent',
        notice: 'Canadian privacy laws require informed consent for recording.',
        rights: [
          'Recording will be stored securely in Canada',
          'Maximum retention period of 30 days',
          'You can access and correct your recorded data',
          'Recording will not be used for marketing',
          'You may withdraw consent at any time'
        ]
      }
    };

    return legalTexts[region] || legalTexts.US;
  };

  const handleAccept = async (auto = false) => {
    setLoading(true);
    
    try {
      // Log consent to backend
      const response = await fetch(`${ENV.apiUrl}/api/compliance/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          consent_type: 'RECORDING',
          granted: true,
          session_id: sessionId,
          conversation_id: conversationId,
          call_type: callType,
          auto_consent: auto,
          ip_address: await getIPAddress(),
          user_agent: getUserAgent()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to log consent');
      }

      const consentRecord = await response.json();

      // Save preference if requested
      if (savePreference && !auto) {
        await AsyncStorage.setItem(
          `@consent:recording:${callerName}`,
          'always_accept'
        );
      }

      // Notify parent component
      onAccept({
        consentId: consentRecord.id,
        timestamp: new Date().toISOString(),
        expiresAt: consentRecord.expires_at
      });

    } catch (error) {
      console.error('Error accepting consent:', error);
      Alert.alert('Error', 'Failed to process consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (auto = false) => {
    setLoading(true);
    
    try {
      // Log declined consent
      await fetch(`${ENV.apiUrl}/api/compliance/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          consent_type: 'RECORDING',
          granted: false,
          session_id: sessionId,
          conversation_id: conversationId,
          call_type: callType,
          auto_consent: auto
        })
      });

      // Save preference if requested
      if (savePreference && !auto) {
        await AsyncStorage.setItem(
          `@consent:recording:${callerName}`,
          'always_decline'
        );
      }

      onDecline();
      
    } catch (error) {
      console.error('Error declining consent:', error);
      onDecline();
    } finally {
      setLoading(false);
    }
  };

  const getIPAddress = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const getUserAgent = () => {
    return `DottApp/${Platform.OS}/${Platform.Version}`;
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://dottapps.com/privacy#recording');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => handleDecline()}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Icon 
                name={callType === 'video' ? 'videocam' : 'mic'} 
                size={40} 
                color="#ef4444" 
              />
              <Text style={styles.title}>{legalText.title}</Text>
            </View>

            {/* Caller Info */}
            <View style={styles.callerInfo}>
              <Text style={styles.callerText}>
                <Text style={styles.callerName}>{callerName}</Text> would like to record this {callType} call
              </Text>
            </View>

            {/* Legal Notice */}
            <View style={styles.noticeBox}>
              <Icon name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.noticeText}>{legalText.notice}</Text>
            </View>

            {/* Rights List */}
            <View style={styles.rightsContainer}>
              <Text style={styles.rightsTitle}>Your Rights:</Text>
              {legalText.rights.map((right, index) => (
                <View key={index} style={styles.rightItem}>
                  <Icon name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.rightText}>{right}</Text>
                </View>
              ))}
            </View>

            {/* Data Usage */}
            <View style={styles.dataUsageContainer}>
              <Text style={styles.dataUsageTitle}>How Your Recording Will Be Used:</Text>
              <Text style={styles.dataUsageText}>
                • Quality assurance and training{'\n'}
                • Dispute resolution if needed{'\n'}
                • Improving our services{'\n'}
                • Never sold or shared with third parties
              </Text>
            </View>

            {/* Consent Checkbox */}
            <View style={styles.consentRow}>
              <Switch
                value={understood}
                onValueChange={setUnderstood}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={understood ? '#ffffff' : '#f3f4f6'}
              />
              <Text style={styles.consentText}>
                I understand and consent to the recording of this {callType} call
              </Text>
            </View>

            {/* Save Preference */}
            <View style={styles.preferenceRow}>
              <Switch
                value={savePreference}
                onValueChange={setSavePreference}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={savePreference ? '#ffffff' : '#f3f4f6'}
              />
              <Text style={styles.preferenceText}>
                Remember my choice for calls with {callerName}
              </Text>
            </View>

            {/* Privacy Policy Link */}
            <TouchableOpacity onPress={openPrivacyPolicy} style={styles.privacyLink}>
              <Text style={styles.privacyLinkText}>
                View our Recording Privacy Policy
              </Text>
              <Icon name="open-outline" size={16} color="#3b82f6" />
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={() => handleDecline()}
                disabled={loading}
              >
                <Icon name="close" size={20} color="#ef4444" />
                <Text style={styles.declineButtonText}>Decline Recording</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.acceptButton,
                  (!understood || loading) && styles.disabledButton
                ]}
                onPress={() => handleAccept()}
                disabled={!understood || loading}
              >
                <Icon name="checkmark" size={20} color="#ffffff" />
                <Text style={styles.acceptButtonText}>Accept & Continue</Text>
              </TouchableOpacity>
            </View>

            {/* Legal Footer */}
            <Text style={styles.legalFooter}>
              By accepting, you agree that this recording will be governed by our privacy policy 
              and applicable laws. You may withdraw consent or request deletion at any time by 
              contacting privacy@dottapps.com
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 10,
    textAlign: 'center',
  },
  callerInfo: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  callerText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
  },
  callerName: {
    fontWeight: 'bold',
    color: '#111827',
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
    flex: 1,
  },
  rightsContainer: {
    marginBottom: 15,
  },
  rightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rightText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  dataUsageContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  dataUsageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  dataUsageText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  consentText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  preferenceText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  privacyLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    marginRight: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  declineButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  declineButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: '#3b82f6',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 5,
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
  },
  legalFooter: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default RecordingConsentModal;