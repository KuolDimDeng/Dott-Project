import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#3498db';
const LIGHT_GREY = '#f4f4f4';
const DARK_GREY = '#34495e';

export default function MenuPage() {
  const router = useRouter();
  const [userFullName, setUserFullName] = useState('');

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const fullName = await AsyncStorage.getItem('userFullName');
        setUserFullName(fullName || 'User');
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };

    fetchUserName();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Menu</Text>
        <Text style={styles.userText}>{userFullName}</Text>
      </View>
      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/createTransaction')}
        >
          <Ionicons name="add-circle-outline" size={24} color={BLUE} />
          <Text style={styles.menuButtonText}>Create Transaction</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/addProduct')}
        >
          <Ionicons name="cube-outline" size={24} color={BLUE} />
          <Text style={styles.menuButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    height: 60,
    backgroundColor: LIGHT_GREY,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    color: DARK_GREY,
    fontSize: 20,
    fontWeight: 'bold',
  },
  userText: {
    color: BLUE,
    fontSize: 16,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
    shadowColor: DARK_GREY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButtonText: {
    color: DARK_GREY,
    fontSize: 16,
    marginLeft: 15,
  },
});