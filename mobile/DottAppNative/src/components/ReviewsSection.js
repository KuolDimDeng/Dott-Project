import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

export default function ReviewsSection({ 
  businessId, 
  productId, 
  reviews = [], 
  onReviewSubmit,
  averageRating = 0,
  totalReviews = 0,
}) {
  const { user } = useAuth();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // recent, helpful, rating

  const submitReview = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to submit a review');
      return;
    }

    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const review = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name || 'Anonymous',
        rating,
        comment: reviewText.trim(),
        date: new Date().toISOString(),
        helpful: 0,
        verified: true,
      };

      if (onReviewSubmit) {
        await onReviewSubmit(review);
      }

      setShowReviewModal(false);
      setRating(5);
      setReviewText('');
      Alert.alert('Success', 'Your review has been submitted');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = (reviewId) => {
    // TODO: Implement API call to mark review as helpful
    Alert.alert('Thanks!', 'Your feedback has been recorded');
  };

  const reportReview = (reviewId) => {
    Alert.alert(
      'Report Review',
      'Are you sure you want to report this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement API call to report review
            Alert.alert('Reported', 'Thank you for your feedback');
          },
        },
      ]
    );
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'helpful':
        return b.helpful - a.helpful;
      case 'rating':
        return b.rating - a.rating;
      case 'recent':
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  const renderRatingBreakdown = () => {
    const breakdown = [5, 4, 3, 2, 1].map(star => {
      const count = reviews.filter(r => r.rating === star).length;
      const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
      return { star, count, percentage };
    });

    return (
      <View style={styles.ratingBreakdown}>
        <View style={styles.overallRating}>
          <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name={star <= Math.round(averageRating) ? "star" : "star-outline"}
                size={20}
                color="#fbbf24"
              />
            ))}
          </View>
          <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
        </View>

        <View style={styles.breakdownBars}>
          {breakdown.map(({ star, count, percentage }) => (
            <View key={star} style={styles.breakdownRow}>
              <Text style={styles.breakdownStar}>{star}</Text>
              <Icon name="star" size={14} color="#fbbf24" />
              <View style={styles.breakdownBarContainer}>
                <View 
                  style={[
                    styles.breakdownBar, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.breakdownCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={styles.reviewerNameRow}>
              <Text style={styles.reviewerName}>{item.userName}</Text>
              {item.verified && (
                <View style={styles.verifiedBadge}>
                  <Icon name="checkmark-circle" size={14} color="#10b981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={star <= item.rating ? "star" : "star-outline"}
                  size={14}
                  color="#fbbf24"
                />
              ))}
              <Text style={styles.reviewDate}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.reviewComment}>{item.comment}</Text>

      <View style={styles.reviewActions}>
        <TouchableOpacity 
          style={styles.helpfulButton}
          onPress={() => markHelpful(item.id)}
        >
          <Icon name="thumbs-up-outline" size={16} color="#6b7280" />
          <Text style={styles.helpfulText}>
            Helpful {item.helpful > 0 && `(${item.helpful})`}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => reportReview(item.id)}
        >
          <Icon name="flag-outline" size={16} color="#6b7280" />
          <Text style={styles.reportText}>Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reviews & Ratings</Text>
        <TouchableOpacity 
          style={styles.writeReviewButton}
          onPress={() => setShowReviewModal(true)}
        >
          <Icon name="create-outline" size={18} color="#2563eb" />
          <Text style={styles.writeReviewText}>Write Review</Text>
        </TouchableOpacity>
      </View>

      {renderRatingBreakdown()}

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'recent', label: 'Most Recent' },
            { key: 'helpful', label: 'Most Helpful' },
            { key: 'rating', label: 'Highest Rated' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                sortBy === option.key && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(option.key)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option.key && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={sortedReviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chatbubbles-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>Be the first to review!</Text>
          </View>
        }
        scrollEnabled={false}
      />

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={styles.ratingLabel}>Your Rating</Text>
            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <Icon
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color="#fbbf24"
                    style={styles.ratingStar}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reviewLabel}>Your Review</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{reviewText.length}/500</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={submitReview}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  writeReviewText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  ratingBreakdown: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  overallRating: {
    alignItems: 'center',
    marginRight: 30,
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  totalReviews: {
    fontSize: 14,
    color: '#6b7280',
  },
  breakdownBars: {
    flex: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownStar: {
    width: 12,
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  breakdownCount: {
    width: 30,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 12,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#2563eb',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  reviewCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reviewHeader: {
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    color: '#10b981',
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 16,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulText: {
    fontSize: 14,
    color: '#6b7280',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ratingStar: {
    marginHorizontal: 4,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});