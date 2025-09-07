import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function DeliveryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Icon name="bicycle-outline" size={48} color="#f59e0b" />
        <Text style={styles.title}>Delivery Orders</Text>
        <Text style={styles.subtitle}>Manage food delivery orders and couriers</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.comingSoon}>Coming Soon</Text>
        <Text style={styles.description}>
          This feature will allow you to manage delivery orders, 
          track couriers, and handle customer delivery requests.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#f59e0b',
    padding: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fef3c7',
    textAlign: 'center',
    maxWidth: 280,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});