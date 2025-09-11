import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * Component that conditionally renders children based on feature access
 * @param {string} feature - The feature code to check
 * @param {ReactNode} children - Components to render if access is granted
 * @param {ReactNode} fallback - Optional component to render if access is denied
 * @param {boolean} showLoading - Whether to show loading indicator
 * @param {boolean} showUpgradePrompt - Whether to show upgrade prompt when access is denied
 */
const FeatureGate = ({ 
  feature, 
  children, 
  fallback = null, 
  showLoading = false,
  showUpgradePrompt = false,
  onUpgradePress = null
}) => {
  const { hasAccess, loading, error } = useFeatureAccess(feature);

  if (loading && showLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }

  if (!hasAccess) {
    if (showUpgradePrompt) {
      return (
        <View style={styles.upgradeContainer}>
          <Icon name="lock-closed-outline" size={48} color="#9ca3af" />
          <Text style={styles.upgradeTitle}>Premium Feature</Text>
          <Text style={styles.upgradeDescription}>
            This feature requires an upgrade to access
          </Text>
          {onUpgradePress && (
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={onUpgradePress}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    return fallback;
  }

  return children;
};

/**
 * Component to show/hide menu items based on feature access
 */
export const FeatureMenuItem = ({ 
  feature, 
  title, 
  icon, 
  onPress, 
  disabled = false,
  showLockIcon = true 
}) => {
  const { hasAccess, loading } = useFeatureAccess(feature);

  if (loading) {
    return null; // Don't show menu item while loading
  }

  const isDisabled = disabled || !hasAccess;

  return (
    <TouchableOpacity
      style={[styles.menuItem, isDisabled && styles.menuItemDisabled]}
      onPress={isDisabled ? null : onPress}
      disabled={isDisabled}
    >
      <View style={styles.menuItemContent}>
        <Icon 
          name={icon} 
          size={24} 
          color={isDisabled ? '#9ca3af' : '#374151'} 
        />
        <Text style={[styles.menuItemText, isDisabled && styles.menuItemTextDisabled]}>
          {title}
        </Text>
      </View>
      {!hasAccess && showLockIcon && (
        <Icon name="lock-closed" size={16} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );
};

/**
 * Badge to show feature status
 */
export const FeatureBadge = ({ feature, style }) => {
  const { hasAccess, loading } = useFeatureAccess(feature);

  if (loading) {
    return null;
  }

  if (hasAccess) {
    return null; // Don't show badge if user has access
  }

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>PRO</Text>
    </View>
  );
};

/**
 * Component to conditionally show content based on multiple features
 */
export const MultiFeatureGate = ({ 
  features = [], 
  requireAll = false, 
  children, 
  fallback = null 
}) => {
  const [hasAccess, setHasAccess] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        const featureApi = require('../services/featureApi').default;
        
        const accessResults = await Promise.all(
          features.map(f => featureApi.hasFeatureAccess(f))
        );

        if (requireAll) {
          // All features must be accessible
          setHasAccess(accessResults.every(access => access));
        } else {
          // At least one feature must be accessible
          setHasAccess(accessResults.some(access => access));
        }
      } catch (error) {
        console.error('Error checking multi-feature access:', error);
        setHasAccess(true); // Default to allowing access on error
      } finally {
        setLoading(false);
      }
    };

    if (features.length > 0) {
      checkAccess();
    } else {
      setLoading(false);
      setHasAccess(true);
    }
  }, [JSON.stringify(features), requireAll]);

  if (loading) {
    return null;
  }

  return hasAccess ? children : fallback;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  menuItemTextDisabled: {
    color: '#9ca3af',
  },
  badge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78350f',
  },
});

export default FeatureGate;