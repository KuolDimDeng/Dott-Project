import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar } from 'react-native';
import { BLEPrinter } from 'react-native-thermal-receipt-printer';

const BLUE = '#3498db';
const LIGHT_GREY = '#f4f4f4';
const DARK_GREY = '#34495e';

export default function BluetoothSettings() {
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [connectedPrinter, setConnectedPrinter] = useState(null);

  const scanForBluetoothDevices = async () => {
    try {
      const devices = await BLEPrinter.getDeviceList();
      setBluetoothDevices(devices);
    } catch (error) {
      console.error('Error scanning for Bluetooth devices:', error);
      Alert.alert('Error', 'Failed to scan for Bluetooth devices');
    }
  };

  const connectToPrinter = async (device) => {
    try {
      await BLEPrinter.connectPrinter(device.macAddress);
      setConnectedPrinter(device);
      Alert.alert('Success', `Connected to printer: ${device.name}`);
    } catch (error) {
      console.error('Error connecting to printer:', error);
      Alert.alert('Error', 'Failed to connect to printer');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Bluetooth Settings</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.scanButton} onPress={scanForBluetoothDevices}>
          <Text style={styles.scanButtonText}>Scan for Devices</Text>
        </TouchableOpacity>
        <FlatList
          data={bluetoothDevices}
          keyExtractor={(item) => item.macAddress}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.deviceItem} onPress={() => connectToPrinter(item)}>
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
        {connectedPrinter && (
          <View style={styles.connectedPrinter}>
            <Text>Connected to: {connectedPrinter.name}</Text>
          </View>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    color: DARK_GREY,
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scanButton: {
    backgroundColor: BLUE,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREY,
  },
  connectedPrinter: {
    marginTop: 20,
    padding: 15,
    backgroundColor: LIGHT_GREY,
    borderRadius: 10,
  },
});