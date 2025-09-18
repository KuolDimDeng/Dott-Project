/**
 * Industry-standard error state components
 * Following Google Material Design and Apple HIG guidelines
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * Network Error State - When user is offline
 * Pattern: Instagram, Facebook, Twitter
 */
export const NetworkErrorState = ({ onRetry, message, showIcon = true }) => (
  <View style={styles.container}>
    {showIcon && (
      <Icon name="cloud-offline-outline" size={64} color="#999" style={styles.icon} />
    )}
    <Text style={styles.title}>You're Offline</Text>
    <Text style={styles.message}>
      {message || "Check your connection and try again"}
    </Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Icon name="refresh" size={20} color="#2563eb" />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    )}
  </View>
);

/**
 * Empty State - When no data is available
 * Pattern: Airbnb, Amazon, Uber
 */
export const EmptyState = ({
  title = "Nothing Here Yet",
  message = "Check back later for new content",
  icon = "basket-outline",
  actionLabel,
  onAction
}) => (
  <View style={styles.container}>
    <Icon name={icon} size={64} color="#999" style={styles.icon} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {onAction && (
      <TouchableOpacity style={styles.primaryButton} onPress={onAction}>
        <Text style={styles.primaryButtonText}>{actionLabel || "Explore"}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/**
 * Loading Error State - When something went wrong
 * Pattern: Netflix, Spotify, YouTube
 */
export const LoadingErrorState = ({
  error,
  onRetry,
  showDetails = false
}) => {
  const errorMessage = error?.message || "Something went wrong";
  const errorCode = error?.code;

  return (
    <View style={styles.container}>
      <Icon name="warning-outline" size={64} color="#ef4444" style={styles.icon} />
      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.message}>{errorMessage}</Text>

      {showDetails && errorCode && (
        <Text style={styles.errorCode}>Error Code: {errorCode}</Text>
      )}

      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Icon name="refresh" size={20} color="#2563eb" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Skeleton Loader - Industry standard loading placeholder
 * Pattern: Facebook, LinkedIn, YouTube
 */
export const SkeletonLoader = ({ count = 3, type = 'card' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return <SkeletonListItem />;
      case 'card':
        return <SkeletonCard />;
      case 'text':
        return <SkeletonText />;
      default:
        return <SkeletonCard />;
    }
  };

  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index}>{renderSkeleton()}</View>
      ))}
    </View>
  );
};

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonTextShort} />
    </View>
  </View>
);

const SkeletonListItem = () => (
  <View style={styles.skeletonListItem}>
    <View style={styles.skeletonAvatar} />
    <View style={styles.skeletonListContent}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonTextShort} />
    </View>
  </View>
);

const SkeletonText = () => (
  <View style={styles.skeletonTextContainer}>
    <View style={styles.skeletonText} />
    <View style={styles.skeletonText} />
    <View style={styles.skeletonTextShort} />
  </View>
);

/**
 * Offline Banner - Shows at top when offline
 * Pattern: WhatsApp, Slack, Discord
 */
export const OfflineBanner = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.offlineBanner}>
      <Icon name="wifi-outline" size={16} color="#fff" />
      <Text style={styles.offlineBannerText}>No Connection</Text>
    </View>
  );
};

/**
 * Stale Data Indicator - Shows when displaying cached data
 * Pattern: Twitter, Reddit, News apps
 */
export const StaleDataIndicator = ({ lastUpdated, onRefresh }) => (
  <TouchableOpacity style={styles.staleDataBanner} onPress={onRefresh}>
    <Icon name="information-circle-outline" size={16} color="#f59e0b" />
    <Text style={styles.staleDataText}>
      Showing offline data. Tap to refresh.
    </Text>
    <Icon name="refresh-outline" size={16} color="#f59e0b" />
  </TouchableOpacity>
);

/**
 * Pull to Refresh Wrapper - Standard refresh pattern
 * Pattern: All major apps
 */
export const RefreshableScrollView = ({
  children,
  onRefresh,
  refreshing = false,
  ...props
}) => (
  <ScrollView
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="#2563eb"
        title="Pull to refresh..."
        titleColor="#999"
      />
    }
    {...props}
  >
    {children}
  </ScrollView>
);

/**
 * Retry with countdown - For rate limiting
 * Pattern: Banking apps, API-heavy apps
 */
export const RetryCountdown = ({
  seconds,
  onRetry,
  message = "Too many attempts"
}) => {
  const [countdown, setCountdown] = React.useState(seconds);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <View style={styles.container}>
      <Icon name="time-outline" size={64} color="#f59e0b" style={styles.icon} />
      <Text style={styles.title}>{message}</Text>
      <Text style={styles.message}>
        Try again in {countdown} seconds
      </Text>
      {countdown === 0 && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Try Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Partial Content Loader - Shows some content while loading more
 * Pattern: YouTube, TikTok, Instagram
 */
export const PartialContentLoader = ({ children, isLoading, error, onRetry }) => (
  <View style={styles.partialContainer}>
    {children}
    {isLoading && (
      <View style={styles.partialLoader}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.partialLoaderText}>Loading more...</Text>
      </View>
    )}
    {error && (
      <TouchableOpacity style={styles.partialError} onPress={onRetry}>
        <Text style={styles.partialErrorText}>Failed to load more</Text>
        <Text style={styles.partialRetryText}>Tap to retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#fff',
  },
  retryText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  errorCode: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 16,
  },

  // Skeleton styles
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  skeletonImage: {
    height: 150,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonContent: {
    gap: 8,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    width: '70%',
  },
  skeletonText: {
    height: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    width: '100%',
  },
  skeletonTextShort: {
    height: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    width: '60%',
  },
  skeletonListItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  skeletonListContent: {
    flex: 1,
    gap: 8,
  },
  skeletonTextContainer: {
    padding: 16,
    gap: 8,
  },

  // Banner styles
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  staleDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  staleDataText: {
    flex: 1,
    color: '#92400e',
    fontSize: 14,
  },

  // Partial content styles
  partialContainer: {
    flex: 1,
  },
  partialLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  partialLoaderText: {
    color: '#6b7280',
    fontSize: 14,
  },
  partialError: {
    alignItems: 'center',
    padding: 16,
  },
  partialErrorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 4,
  },
  partialRetryText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default {
  NetworkErrorState,
  EmptyState,
  LoadingErrorState,
  SkeletonLoader,
  OfflineBanner,
  StaleDataIndicator,
  RefreshableScrollView,
  RetryCountdown,
  PartialContentLoader,
};