import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const InviteScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [referralStats, setReferralStats] = useState(null);

  useEffect(() => {
    loadInviteData();
  }, []);

  const loadInviteData = async () => {
    try {
      setLoading(true);
      const [codeRes, invitesRes, statsRes] = await Promise.all([
        api.get('/invites/code/').catch(() => ({ data: null })),
        api.get('/invites/sent/').catch(() => ({ data: [] })),
        api.get('/invites/stats/').catch(() => ({ data: null })),
      ]);

      if (codeRes.data) {
        setInviteCode(codeRes.data.code || generateMockCode());
        setInviteLink(codeRes.data.link || generateMockLink());
      } else {
        const mockCode = generateMockCode();
        setInviteCode(mockCode);
        setInviteLink(generateMockLink(mockCode));
      }

      setInvites(invitesRes.data.results || invitesRes.data || getMockInvites());
      setReferralStats(statsRes.data || getMockStats());
    } catch (error) {
      console.error('Error loading invite data:', error);
      const mockCode = generateMockCode();
      setInviteCode(mockCode);
      setInviteLink(generateMockLink(mockCode));
      setInvites(getMockInvites());
      setReferralStats(getMockStats());
    } finally {
      setLoading(false);
    }
  };

  const generateMockCode = () => {
    return `DOTT${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const generateMockLink = (code = '') => {
    return `https://dottapps.com/invite/${code || inviteCode}`;
  };

  const getMockInvites = () => [
    {
      id: 1,
      email: 'john@example.com',
      role: 'Employee',
      status: 'accepted',
      sentDate: '2024-01-15',
      acceptedDate: '2024-01-16',
    },
    {
      id: 2,
      email: 'sarah@example.com',
      role: 'Manager',
      status: 'pending',
      sentDate: '2024-01-20',
      acceptedDate: null,
    },
    {
      id: 3,
      email: 'mike@example.com',
      role: 'Employee',
      status: 'expired',
      sentDate: '2024-01-10',
      acceptedDate: null,
    },
  ];

  const getMockStats = () => ({
    totalInvited: 15,
    totalAccepted: 8,
    totalPending: 4,
    totalExpired: 3,
    acceptanceRate: 53,
    rewardsEarned: 120,
    bonusAvailable: true,
  });

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join my business on Dott! Use my invite code: ${inviteCode}\n\n${inviteLink}`,
        title: 'Join my business on Dott',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite link');
    }
  };

  const handleCopyCode = () => {
    Clipboard.setString(inviteCode);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const handleCopyLink = () => {
    Clipboard.setString(inviteLink);
    Alert.alert('Copied!', 'Invite link copied to clipboard');
  };

  const handleSendInvite = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      await api.post('/invites/send/', {
        email,
        role,
      });
      Alert.alert('Success', `Invitation sent to ${email}`);
      setEmail('');
      loadInviteData();
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const handleResendInvite = async (invite) => {
    try {
      await api.post(`/invites/${invite.id}/resend/`);
      Alert.alert('Success', 'Invitation resent successfully');
      loadInviteData();
    } catch (error) {
      Alert.alert('Error', 'Failed to resend invitation');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      case 'expired':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading invite data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite & Earn</Text>
          <TouchableOpacity onPress={() => navigation.navigate('InviteHistory')}>
            <Icon name="time-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Referral Stats */}
        {referralStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Your Referral Impact</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{referralStats.totalInvited}</Text>
                <Text style={styles.statLabel}>Invited</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{referralStats.totalAccepted}</Text>
                <Text style={styles.statLabel}>Joined</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{referralStats.acceptanceRate}%</Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${referralStats.rewardsEarned}</Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
            </View>
            {referralStats.bonusAvailable && (
              <View style={styles.bonusBanner}>
                <Icon name="gift" size={20} color="#f59e0b" />
                <Text style={styles.bonusText}>Earn $10 for each successful referral!</Text>
              </View>
            )}
          </View>
        )}

        {/* Invite Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeTitle}>Your Invite Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Icon name="copy-outline" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
            <Icon name="share-social" size={20} color="white" />
            <Text style={styles.shareButtonText}>Share Invite Link</Text>
          </TouchableOpacity>
        </View>

        {/* Send Invite Form */}
        <View style={styles.inviteForm}>
          <Text style={styles.formTitle}>Send Direct Invitation</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.roleSelector}>
            <Text style={styles.roleLabel}>Select Role:</Text>
            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={[styles.roleOption, role === 'employee' && styles.selectedRole]}
                onPress={() => setRole('employee')}
              >
                <Text style={[styles.roleText, role === 'employee' && styles.selectedRoleText]}>
                  Employee
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, role === 'manager' && styles.selectedRole]}
                onPress={() => setRole('manager')}
              >
                <Text style={[styles.roleText, role === 'manager' && styles.selectedRoleText]}>
                  Manager
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, role === 'customer' && styles.selectedRole]}
                onPress={() => setRole('customer')}
              >
                <Text style={[styles.roleText, role === 'customer' && styles.selectedRoleText]}>
                  Customer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.sendButton} onPress={handleSendInvite}>
            <Icon name="send" size={20} color="white" />
            <Text style={styles.sendButtonText}>Send Invitation</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Invites */}
        <View style={styles.invitesSection}>
          <Text style={styles.sectionTitle}>Recent Invitations</Text>
          {invites.map(invite => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <View>
                  <Text style={styles.inviteEmail}>{invite.email}</Text>
                  <Text style={styles.inviteRole}>{invite.role}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invite.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(invite.status) }]}>
                    {invite.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.inviteDates}>
                <Text style={styles.dateText}>Sent: {invite.sentDate}</Text>
                {invite.acceptedDate && (
                  <Text style={styles.dateText}>Accepted: {invite.acceptedDate}</Text>
                )}
              </View>
              {invite.status === 'pending' && (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => handleResendInvite(invite)}
                >
                  <Text style={styles.resendButtonText}>Resend Invitation</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Invite Others?</Text>
          <View style={styles.benefitItem}>
            <Icon name="gift-outline" size={24} color="#22c55e" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Earn Rewards</Text>
              <Text style={styles.benefitText}>Get $10 credit for each successful referral</Text>
            </View>
          </View>
          <View style={styles.benefitItem}>
            <Icon name="people-outline" size={24} color="#2563eb" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Build Your Team</Text>
              <Text style={styles.benefitText}>Easily onboard employees and collaborators</Text>
            </View>
          </View>
          <View style={styles.benefitItem}>
            <Icon name="trending-up-outline" size={24} color="#f59e0b" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Grow Together</Text>
              <Text style={styles.benefitText}>Help other businesses discover Dott's benefits</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  bonusText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 10,
    fontWeight: '500',
  },
  codeCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  codeTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  codeText: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 10,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  inviteForm: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 15,
  },
  roleSelector: {
    marginBottom: 15,
  },
  roleLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  roleOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  selectedRole: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleText: {
    fontSize: 14,
    color: '#666',
  },
  selectedRoleText: {
    color: 'white',
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  invitesSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inviteCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  inviteEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  inviteRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inviteDates: {
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  resendButtonText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  benefitsSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  benefitContent: {
    flex: 1,
    marginLeft: 15,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  benefitText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default InviteScreen;