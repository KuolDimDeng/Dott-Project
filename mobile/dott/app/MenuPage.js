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
          onPress={() => router.push('/createSales')}
        >
          <Ionicons name="cart-outline" size={24} color={BLUE} />
          <Text style={styles.menuButtonText}>Create Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/addProduct')}
        >
          <Ionicons name="cube-outline" size={24} color={BLUE} />
          <Text style={styles.menuButtonText}>Add Product</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/salesHistory')}
        >
          <Ionicons name="list-outline" size={24} color={BLUE} />
          <Text style={styles.menuButtonText}>Sales History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/bluetoothSettings')}
        >
          <Ionicons name="bluetooth-outline" size={24} color={BLUE} />
          <Text style={styles.menuButtonText}>Bluetooth Settings</Text>
        </TouchableOpacity>
        
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.menuButton, styles.bottomButton]}
            onPress={() => router.push('/about')}
          >
            <Ionicons name="information-circle-outline" size={24} color={BLUE} />
            <Text style={styles.menuButtonText}>About Dott</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.menuButton, styles.bottomButton, styles.logoutButton]}
            onPress={async () => {
              await AsyncStorage.clear();
              router.replace('/');
            }}
          >
            <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
            <Text style={[styles.menuButtonText, {color: '#e74c3c'}]}>Logout</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    justifyContent: 'space-between',
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
  bottomButton: {
    marginTop: 10,
  },
  footerButtons: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logoutButton: {
    backgroundColor: '#fff8f8',
  },
});