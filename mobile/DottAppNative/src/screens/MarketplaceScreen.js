import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function MarketplaceScreen() {
  const categories = [
    { id: '1', name: 'Food & Drinks', icon: 'restaurant', color: '#f97316' },
    { id: '2', name: 'Shopping', icon: 'cart', color: '#ec4899' },
    { id: '3', name: 'Services', icon: 'construct', color: '#8b5cf6' },
    { id: '4', name: 'Transport', icon: 'car', color: '#3b82f6' },
    { id: '5', name: 'Health', icon: 'medical', color: '#10b981' },
    { id: '6', name: 'Beauty', icon: 'sparkles', color: '#f472b6' },
    { id: '7', name: 'Entertainment', icon: 'game-controller', color: '#a855f7' },
    { id: '8', name: 'Education', icon: 'school', color: '#0ea5e9' },
  ];

  const featuredBusinesses = [
    { id: '1', name: 'Pizza Palace', category: 'Restaurant', rating: 4.5 },
    { id: '2', name: 'Quick Mart', category: 'Grocery', rating: 4.8 },
    { id: '3', name: 'City Taxi', category: 'Transport', rating: 4.2 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Icon name="search" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity key={category.id} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Icon name={category.icon} size={24} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Businesses</Text>
          {featuredBusinesses.map((business) => (
            <TouchableOpacity key={business.id} style={styles.businessCard}>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{business.name}</Text>
                <Text style={styles.businessCategory}>{business.category}</Text>
              </View>
              <View style={styles.businessRating}>
                <Icon name="star" size={16} color="#fbbf24" />
                <Text style={styles.ratingText}>{business.rating}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  searchButton: {
    padding: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  businessCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  businessRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
});