import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SubcategoryModal({
  visible,
  onClose,
  mainCategory,
  subcategories,
  onSelectSubcategory,
}) {
  if (!mainCategory) return null;

  const renderSubcategoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.subcategoryItem}
      onPress={() => {
        onSelectSubcategory(mainCategory.id, item.id);
        onClose();
      }}
    >
      <View style={styles.subcategoryContent}>
        <Text style={styles.subcategoryName}>{item.name}</Text>
        {item.count > 0 && (
          <Text style={styles.subcategoryCount}>{item.count} businesses</Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  // Add "All" option at the beginning if not already present
  const subcategoriesWithAll = subcategories && subcategories[0]?.id !== 'all' 
    ? [{ id: 'all', name: `All ${mainCategory.name}`, count: mainCategory.count || 0 }, ...subcategories]
    : subcategories;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View 
                style={[
                  styles.categoryIcon,
                  { backgroundColor: mainCategory.color || '#6c757d' }
                ]}
              >
                <Icon name={mainCategory.icon} size={24} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>{mainCategory.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Subcategories List */}
          <FlatList
            data={subcategoriesWithAll}
            keyExtractor={(item) => item.id}
            renderItem={renderSubcategoryItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.75,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  subcategoryContent: {
    flex: 1,
  },
  subcategoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  subcategoryCount: {
    fontSize: 14,
    color: '#6b7280',
  },
});