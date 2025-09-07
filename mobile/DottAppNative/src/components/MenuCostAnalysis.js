import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMenuContext } from '../context/MenuContext';

const MenuCostAnalysis = ({ visible, onClose }) => {
  const { menuItems } = useMenuContext();
  const [analysis, setAnalysis] = useState({
    totalItems: 0,
    averageProfit: 0,
    highProfitItems: [],
    lowProfitItems: [],
    mostExpensiveItems: [],
    bestValueItems: [],
    totalRevenuePotential: 0,
    totalCostPotential: 0,
  });

  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      calculateAnalysis();
    }
  }, [menuItems]);

  const calculateAnalysis = () => {
    const validItems = menuItems.filter(item => 
      item.price && item.estimatedCost && 
      !isNaN(item.price) && !isNaN(item.estimatedCost)
    );

    if (validItems.length === 0) {
      setAnalysis({
        totalItems: menuItems.length,
        averageProfit: 0,
        highProfitItems: [],
        lowProfitItems: [],
        mostExpensiveItems: [],
        bestValueItems: [],
        totalRevenuePotential: 0,
        totalCostPotential: 0,
      });
      return;
    }

    // Calculate profit margins
    const itemsWithMargins = validItems.map(item => {
      const price = parseFloat(item.price) || 0;
      const cost = parseFloat(item.estimatedCost) || 0;
      const profit = price - cost;
      const margin = price > 0 ? (profit / price) * 100 : 0;
      
      return {
        ...item,
        profit,
        margin,
        profitRatio: cost > 0 ? profit / cost : 0,
      };
    });

    // Sort by different criteria
    const sortedByMargin = [...itemsWithMargins].sort((a, b) => b.margin - a.margin);
    const sortedByPrice = [...itemsWithMargins].sort((a, b) => b.price - a.price);
    const sortedByValue = [...itemsWithMargins].sort((a, b) => (b.price - b.estimatedCost) - (a.price - a.estimatedCost));

    // Calculate totals
    const totalRevenue = itemsWithMargins.reduce((sum, item) => sum + item.price, 0);
    const totalCost = itemsWithMargins.reduce((sum, item) => sum + item.estimatedCost, 0);
    const averageProfit = itemsWithMargins.reduce((sum, item) => sum + item.margin, 0) / itemsWithMargins.length;

    setAnalysis({
      totalItems: menuItems.length,
      averageProfit: averageProfit,
      highProfitItems: sortedByMargin.slice(0, 5),
      lowProfitItems: sortedByMargin.slice(-5).reverse(),
      mostExpensiveItems: sortedByPrice.slice(0, 5),
      bestValueItems: sortedByValue.slice(0, 5),
      totalRevenuePotential: totalRevenue,
      totalCostPotential: totalCost,
    });
  };

  const getProfitColor = (margin) => {
    if (margin >= 50) return '#10b981'; // Green
    if (margin >= 30) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const renderInsightCard = ({ title, value, subtitle, color = '#3b82f6', icon }) => (
    <View style={[styles.insightCard, { borderLeftColor: color }]}>
      <View style={styles.insightHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.insightTitle}>{title}</Text>
      </View>
      <Text style={[styles.insightValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.insightSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderMenuItem = ({ item }) => (
    <View style={styles.menuItem}>
      <View style={styles.menuItemHeader}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text style={[styles.menuItemMargin, { color: getProfitColor(item.margin) }]}>
          {item.margin?.toFixed(1)}%
        </Text>
      </View>
      <View style={styles.menuItemDetails}>
        <Text style={styles.menuItemPrice}>Price: ${item.price?.toFixed(2)}</Text>
        <Text style={styles.menuItemCost}>Cost: ${item.estimatedCost?.toFixed(2)}</Text>
        <Text style={styles.menuItemProfit}>Profit: ${item.profit?.toFixed(2)}</Text>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Cost Analysis</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>📊 Overview</Text>
          <View style={styles.overviewGrid}>
            {renderInsightCard({
              title: 'Total Menu Items',
              value: analysis.totalItems.toString(),
              icon: 'restaurant-outline',
              color: '#8b5cf6'
            })}
            
            {renderInsightCard({
              title: 'Average Profit Margin',
              value: `${analysis.averageProfit.toFixed(1)}%`,
              subtitle: analysis.averageProfit >= 40 ? 'Excellent!' : analysis.averageProfit >= 25 ? 'Good' : 'Needs Improvement',
              icon: 'trending-up-outline',
              color: getProfitColor(analysis.averageProfit)
            })}
            
            {renderInsightCard({
              title: 'Revenue Potential',
              value: `$${analysis.totalRevenuePotential.toFixed(2)}`,
              subtitle: 'If selling all items once',
              icon: 'cash-outline',
              color: '#10b981'
            })}
            
            {renderInsightCard({
              title: 'Cost Potential',
              value: `$${analysis.totalCostPotential.toFixed(2)}`,
              subtitle: 'Total ingredient costs',
              icon: 'calculator-outline',
              color: '#ef4444'
            })}
          </View>
        </View>

        {/* High Profit Items */}
        {analysis.highProfitItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🌟 Most Profitable Items</Text>
              <Text style={styles.sectionSubtitle}>Your money makers!</Text>
            </View>
            <FlatList
              data={analysis.highProfitItems}
              renderItem={renderMenuItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Low Profit Items */}
        {analysis.lowProfitItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚠️ Low Margin Items</Text>
              <Text style={styles.sectionSubtitle}>Consider price adjustments</Text>
            </View>
            <FlatList
              data={analysis.lowProfitItems}
              renderItem={renderMenuItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Premium Items */}
        {analysis.mostExpensiveItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💎 Premium Items</Text>
              <Text style={styles.sectionSubtitle}>Your highest priced dishes</Text>
            </View>
            <FlatList
              data={analysis.mostExpensiveItems}
              renderItem={renderMenuItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Smart Recommendations</Text>
          <View style={styles.recommendationsContainer}>
            {analysis.averageProfit < 30 && (
              <View style={styles.recommendation}>
                <Icon name="warning-outline" size={20} color="#f59e0b" />
                <Text style={styles.recommendationText}>
                  Consider increasing prices or reducing ingredient costs. Ideal profit margin is 40-60%.
                </Text>
              </View>
            )}
            
            {analysis.lowProfitItems.length > 0 && (
              <View style={styles.recommendation}>
                <Icon name="trending-up-outline" size={20} color="#3b82f6" />
                <Text style={styles.recommendationText}>
                  Focus marketing on your high-margin items to boost overall profitability.
                </Text>
              </View>
            )}
            
            <View style={styles.recommendation}>
              <Icon name="bulb-outline" size={20} color="#10b981" />
              <Text style={styles.recommendationText}>
                Track which items sell most frequently and optimize their costs for maximum profit.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  overviewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  menuItemMargin: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuItemPrice: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  menuItemCost: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  menuItemProfit: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recommendationText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});

export default MenuCostAnalysis;