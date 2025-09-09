import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function UserManagementScreen({ navigation }) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/mobile/users/team_members/');
      if (response.data.success) {
        setTeamMembers(response.data.data);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleStatus = async (memberId, currentStatus) => {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await api.post(`/auth/mobile/users/${memberId}/toggle_status/`);
              if (response.data.success) {
                Alert.alert('Success', response.data.message);
                loadTeamMembers();
              }
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} user`);
            }
          },
        },
      ]
    );
  };

  const handleRemoveUser = async (memberId, memberName) => {
    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${memberName} from your business?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/auth/mobile/users/${memberId}/remove_user/`);
              if (response.data.success) {
                Alert.alert('Success', 'User removed successfully');
                loadTeamMembers();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove user');
            }
          },
        },
      ]
    );
  };

  const renderMemberCard = (member) => {
    const isOwner = member.role === 'OWNER';
    const isActive = member.status === 'active';
    
    return (
      <TouchableOpacity
        key={member.id}
        style={styles.memberCard}
        onPress={() => !isOwner && navigation.navigate('UserDetail', { userId: member.id })}
        disabled={isOwner}
      >
        <View style={styles.memberHeader}>
          <View style={styles.memberInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {member.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </Text>
            </View>
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{member.full_name || 'Unknown User'}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
              {member.phone && (
                <Text style={styles.memberPhone}>{member.phone}</Text>
              )}
            </View>
          </View>
          <View style={styles.memberActions}>
            <View style={[styles.roleBadge, styles[`role${member.role}`]]}>
              <Text style={styles.roleText}>{member.role}</Text>
            </View>
            {!isOwner && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleStatus(member.id, member.status)}
                >
                  <Icon
                    name={isActive ? 'pause-circle' : 'play-circle'}
                    size={24}
                    color={isActive ? '#f59e0b' : '#10b981'}
                  />
                </TouchableOpacity>
                {user?.role === 'OWNER' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleRemoveUser(member.id, member.full_name)}
                  >
                    <Icon name="trash-outline" size={24} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.memberFooter}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, isActive ? styles.statusActive : styles.statusInactive]} />
            <Text style={styles.statusText}>{isActive ? 'Active' : 'Inactive'}</Text>
          </View>
          {member.last_login && (
            <Text style={styles.lastLogin}>
              Last login: {new Date(member.last_login).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        {member.permissions && member.permissions.length > 0 && (
          <View style={styles.permissionsContainer}>
            <Text style={styles.permissionsLabel}>Access:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {member.permissions.map((perm, index) => (
                <View key={index} style={styles.permissionBadge}>
                  <Text style={styles.permissionText}>{perm.page}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading team members...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Management</Text>
        {user?.role === 'OWNER' && (
          <TouchableOpacity onPress={() => navigation.navigate('AddUser')}>
            <Icon name="person-add" size={24} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTeamMembers} />
        }
      >
        {teamMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Team Members</Text>
            <Text style={styles.emptyText}>
              Add team members to help manage your business
            </Text>
            {user?.role === 'OWNER' && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddUser')}
              >
                <Icon name="person-add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Team Member</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{teamMembers.length}</Text>
                <Text style={styles.statLabel}>Total Members</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {teamMembers.filter(m => m.status === 'active').length}
                </Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {teamMembers.filter(m => m.role === 'ADMIN').length}
                </Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>
            </View>

            {teamMembers.map(renderMemberCard)}
          </>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4338ca',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  memberPhone: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  memberActions: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleOWNER: {
    backgroundColor: '#fee2e2',
  },
  roleADMIN: {
    backgroundColor: '#fed7aa',
  },
  roleUSER: {
    backgroundColor: '#dbeafe',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 13,
    color: '#6b7280',
  },
  lastLogin: {
    fontSize: 12,
    color: '#9ca3af',
  },
  permissionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  permissionsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  permissionBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  permissionText: {
    fontSize: 11,
    color: '#4b5563',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});