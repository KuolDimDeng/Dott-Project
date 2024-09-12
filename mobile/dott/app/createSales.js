import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../components/utils/axiosConfig';
import BarcodeScanner from './BarcodeScanner';

const BLUE = '#3498db';
const LIGHT_GREY = '#f4f4f4';
const DARK_GREY = '#34495e';

export default function CreateSales() {
  const [scanMode, setScanMode] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleBarCodeScanned = async (barcode) => {
    try {
      const response = await axiosInstance.get(`/api/products/barcode/${barcode}`);
      setScannedProduct(response.data);
      setScanMode(false);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const handleCreateSale = async () => {
    if (!scannedProduct || !selectedCustomer || !paymentMethod) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const saleData = {
        product: scannedProduct.id,
        customer: selectedCustomer,
        payment_method: paymentMethod,
        quantity: 1, // You might want to add a quantity input field
      };

      const response = await axiosInstance.post('/api/sales/create/', saleData);
      alert('Sale created successfully');
      // Reset form or navigate to another screen
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Error creating sale');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Create Sale</Text>
      </View>
      <View style={styles.content}>
        {scanMode ? (
          <BarcodeScanner onBarCodeScanned={handleBarCodeScanned} />
        ) : (
          <>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setScanMode(true)}
            >
              <Ionicons name="barcode-outline" size={24} color={BLUE} />
              <Text style={styles.scanButtonText}>Scan Barcode</Text>
            </TouchableOpacity>
            {scannedProduct && (
              <View style={styles.productInfo}>
                <Text>Name: {scannedProduct.name}</Text>
                <Text>Description: {scannedProduct.description}</Text>
                <Text>Price: ${scannedProduct.price}</Text>
              </View>
            )}
            <Picker
              selectedValue={selectedCustomer}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
            >
              <Picker.Item label="Select Customer" value="" />
              {customers.map((customer) => (
                <Picker.Item
                  key={customer.id}
                  label={customer.customerName || `${customer.first_name} ${customer.last_name}`}
                  value={customer.id}
                />
              ))}
            </Picker>
            <Picker
              selectedValue={paymentMethod}
              style={styles.picker}
              onValueChange={(itemValue) => setPaymentMethod(itemValue)}
            >
              <Picker.Item label="Select Payment Method" value="" />
              <Picker.Item label="Cash" value="cash" />
              <Picker.Item label="Card" value="card" />
              <Picker.Item label="Invoice" value="invoice" />
            </Picker>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateSale}
            >
              <Text style={styles.createButtonText}>Create Sale</Text>
            </TouchableOpacity>
          </>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_GREY,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  scanButtonText: {
    color: BLUE,
    fontSize: 16,
    marginLeft: 15,
  },
  customerSection: {
    backgroundColor: LIGHT_GREY,
    borderRadius: 10,
    padding: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: DARK_GREY,
  },
  input: {
    height: 50,
    borderColor: DARK_GREY,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  dropdown: {
    backgroundColor: 'white',
    borderColor: DARK_GREY,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderColor: DARK_GREY,
  },
  
});