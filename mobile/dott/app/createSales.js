import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, TextInput, FlatList, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../components/utils/axiosConfig';
import BarcodeScanner from './BarcodeScanner';
import { BLEPrinter } from 'react-native-thermal-receipt-printer';

const BLUE = '#3498db';
const LIGHT_GREY = '#f4f4f4';
const DARK_GREY = '#34495e';

export default function CreateSales() {
  const [scanMode, setScanMode] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [total, setTotal] = useState(0);
  const [amountGiven, setAmountGiven] = useState('');
  const [changeDue, setChangeDue] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (scannedProduct) {
      setTotal(scannedProduct.price * quantity);
    }
  }, [scannedProduct, quantity]);

  useEffect(() => {
    if (paymentMethod === 'cash' && amountGiven) {
      setChangeDue(parseFloat(amountGiven) - total);
    }
  }, [paymentMethod, amountGiven, total]);

  const fetchCustomers = async () => {
    try {
      const response = await useApi.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to fetch customers');
    }
  };

  const handleBarCodeScanned = async (barcode) => {
    try {
      const response = await useApi.get(`/api/products/barcode/${barcode}`);
      setScannedProduct(response.data);
      setScanMode(false);
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to fetch product details');
    }
  };

  const handleCreateSale = async () => {
    if (!scannedProduct || (!selectedCustomer && !newCustomerName) || !paymentMethod) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      let customerId = selectedCustomer ? selectedCustomer.id : null;

      if (!customerId) {
        // Create a new customer
        const newCustomerResponse = await useApi.post('/api/customers/', { name: newCustomerName });
        customerId = newCustomerResponse.data.id;
      }

      const saleData = {
        product: scannedProduct.id,
        customer: customerId,
        payment_method: paymentMethod,
        quantity: quantity,
        total_amount: total,
        amount_given: paymentMethod === 'cash' ? parseFloat(amountGiven) : null,
        change_due: paymentMethod === 'cash' ? changeDue : null,
      };

      const response = await useApi.post('/api/sales/create/', saleData);
      Alert.alert('Success', 'Sale created successfully');
      
      // Print receipt
      await printReceipt(response.data);

      // Reset form
      setScannedProduct(null);
      setSelectedCustomer(null);
      setNewCustomerName('');
      setPaymentMethod('');
      setQuantity(1);
      setTotal(0);
      setAmountGiven('');
      setChangeDue(0);
    } catch (error) {
      console.error('Error creating sale:', error);
      Alert.alert('Error', 'Failed to create sale');
    }
  };

  const handleCustomerInput = (text) => {
    setNewCustomerName(text);
    setSelectedCustomer(null);
    if (text.length > 0) {
      const filtered = customers.filter(customer => 
        (customer.name || `${customer.first_name} ${customer.last_name}`)
          .toLowerCase()
          .includes(text.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setNewCustomerName(customer.name || `${customer.first_name} ${customer.last_name}`);
    setFilteredCustomers([]);
  };

  const printReceipt = async (sale) => {
    try {
      await BLEPrinter.printText(`Sale Receipt\n`);
      await BLEPrinter.printText(`Product: ${scannedProduct.name}\n`);
      await BLEPrinter.printText(`Quantity: ${quantity}\n`);
      await BLEPrinter.printText(`Total: $${total.toFixed(2)}\n`);
      await BLEPrinter.printText(`Payment: ${paymentMethod}\n`);
      if (paymentMethod === 'cash') {
        await BLEPrinter.printText(`Amount Given: $${amountGiven}\n`);
        await BLEPrinter.printText(`Change Due: $${changeDue.toFixed(2)}\n`);
      }
      await BLEPrinter.printText(`Date: ${new Date().toLocaleString()}\n`);
      await BLEPrinter.printText(`\n\n`);
    } catch (e) {
      console.error('Error printing receipt:', e);
      Alert.alert('Error', 'Failed to print receipt');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Create Sale</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Product</Text>
          {scanMode ? (
            <BarcodeScanner onBarCodeScanned={handleBarCodeScanned} />
          ) : (
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setScanMode(true)}
            >
              <Ionicons name="barcode-outline" size={24} color={BLUE} />
              <Text style={styles.scanButtonText}>Scan Barcode</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {scannedProduct && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            <View style={styles.productInfo}>
              <Text>Name: {scannedProduct.name}</Text>
              <Text>Description: {scannedProduct.description}</Text>
              <Text>Price: ${scannedProduct.price}</Text>
              <View style={styles.quantityContainer}>
                <Text style={styles.label}>Quantity:</Text>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity.toString()}
                  onChangeText={(text) => setQuantity(parseInt(text) || 1)}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter customer name"
            value={newCustomerName}
            onChangeText={handleCustomerInput}
          />
          {filteredCustomers.length > 0 && (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => selectCustomer(item)}
                >
                  <Text>{item.name || `${item.first_name} ${item.last_name}`}</Text>
                </TouchableOpacity>
              )}
              style={styles.customerList}
            />
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.pickerContainer}>
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
          </View>
        </View>
        
        {paymentMethod === 'cash' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cash Payment</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount Given"
              value={amountGiven}
              onChangeText={setAmountGiven}
              keyboardType="numeric"
            />
            <Text style={styles.changeText}>Change Due: ${changeDue.toFixed(2)}</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateSale}
        >
          <Text style={styles.createButtonText}>Create Sale</Text>
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
  section: {
    marginBottom: 20,
    backgroundColor: LIGHT_GREY,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: DARK_GREY,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  scanButtonText: {
    color: BLUE,
    fontSize: 16,
    marginLeft: 15,
  },
  productInfo: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  quantityInput: {
    height: 40,
    width: 50,
    borderColor: DARK_GREY,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginLeft: 10,
    backgroundColor: 'white',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
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
  customerList: {
    maxHeight: 150,
    borderColor: DARK_GREY,
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: 'white',
  },
  customerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREY,
  },
  pickerContainer: {
    borderColor: DARK_GREY,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  changeText: {
    fontSize: 16,
    marginTop: 10,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: LIGHT_GREY,
  },
  createButton: {
    backgroundColor: BLUE,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});