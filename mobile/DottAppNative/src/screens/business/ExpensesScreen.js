import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ExpensesScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Office Supplies',
    date: new Date().toISOString().split('T')[0],
  });

  const categories = [
    'Office Supplies',
    'Travel',
    'Utilities',
    'Marketing',
    'Equipment',
    'Rent',
    'Other',
  ];

  const addExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const sessionId = await AsyncStorage.getItem('sessionId');
      
      // TODO: Call backend API to save expense
      const response = await fetch('https://api.dottapps.com/api/expenses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify({
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          date: expenseForm.date,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Expense added successfully');
        setShowAddExpense(false);
        setExpenseForm({
          description: '',
          amount: '',
          category: 'Office Supplies',
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity 
          onPress={() => setShowAddExpense(!showAddExpense)}
          style={styles.addButton}
        >
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {showAddExpense && (
          <View style={styles.addExpenseForm}>
            <Text style={styles.formTitle}>Add New Expense</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={expenseForm.description}
              onChangeText={(text) => setExpenseForm({...expenseForm, description: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Amount"
              keyboardType="decimal-pad"
              value={expenseForm.amount}
              onChangeText={(text) => setExpenseForm({...expenseForm, amount: text})}
            />
            
            <View style={styles.categoryContainer}>
              <Text style={styles.label}>Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      expenseForm.category === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setExpenseForm({...expenseForm, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      expenseForm.category === category && styles.categoryButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={addExpense}>
              <Text style={styles.submitButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>This Month</Text>
          <Text style={styles.summaryAmount}>$0.00</Text>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
        </View>

        <View style={styles.expensesList}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No expenses recorded</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to add your first expense
              </Text>
            </View>
          ) : (
            expenses.map((expense, index) => (
              <TouchableOpacity key={index} style={styles.expenseItem}>
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseCategory}>{expense.category}</Text>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>${expense.amount}</Text>
                  <Text style={styles.expenseDate}>{expense.date}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
    backgroundColor: '#ef4444',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  addExpenseForm: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#ef4444',
  },
  categoryButtonText: {
    color: '#374151',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  expensesList: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  expenseItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  expenseCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  expenseDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});