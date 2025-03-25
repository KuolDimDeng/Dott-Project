import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#3498db';
const LIGHT_GREY = '#f4f4f4';
const DARK_GREY = '#34495e';
const TEXT_GREY = '#7f8c8d';

export default function About() {
  const router = useRouter();

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={DARK_GREY} />
        </TouchableOpacity>
        <Text style={styles.headerText}>About Dott</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Image 
            source={require('../assets/images/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Dott POS</Text>
          <Text style={styles.version}>Version 1.2.3</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            Dott is built to empower small businesses with enterprise-grade point of sale 
            technology that's affordable, intuitive, and powerful. We believe in leveling 
            the playing field so businesses of all sizes can thrive in today's competitive 
            marketplace.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featureItem}>
            <Ionicons name="barcode-outline" size={24} color={BLUE} style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Barcode Scanning</Text>
              <Text style={styles.featureText}>Instantly scan products for quick checkout</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="wifi-outline" size={24} color={BLUE} style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Cloud Synchronization</Text>
              <Text style={styles.featureText}>Seamlessly sync data across all your devices</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="print-outline" size={24} color={BLUE} style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Bluetooth Printing</Text>
              <Text style={styles.featureText}>Connect to thermal printers for receipts</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="stats-chart-outline" size={24} color={BLUE} style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Sales Analytics</Text>
              <Text style={styles.featureText}>Track performance with real-time insights</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Team</Text>
          <Text style={styles.sectionText}>
            Dott is developed by a passionate team of engineers, designers, and business 
            experts dedicated to creating solutions that make a difference for small business 
            owners worldwide.
          </Text>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => openLink('https://dottapps.com')}
          >
            <Ionicons name="globe-outline" size={20} color={DARK_GREY} />
            <Text style={styles.contactButtonText}>dottapps.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => openLink('mailto:support@dottapps.com')}
          >
            <Ionicons name="mail-outline" size={20} color={DARK_GREY} />
            <Text style={styles.contactButtonText}>support@dottapps.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => openLink('https://twitter.com/dottapps')}
          >
            <Ionicons name="logo-twitter" size={20} color={DARK_GREY} />
            <Text style={styles.contactButtonText}>@dottapps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legalSection}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.legalText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.copyright}>© 2025 Dott Apps Inc. All rights reserved.</Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    color: DARK_GREY,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: LIGHT_GREY,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DARK_GREY,
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: TEXT_GREY,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DARK_GREY,
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: TEXT_GREY,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DARK_GREY,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: TEXT_GREY,
    lineHeight: 20,
  },
  contactSection: {
    padding: 24,
    backgroundColor: LIGHT_GREY,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: DARK_GREY,
  },
  legalSection: {
    padding: 24,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 14,
    color: BLUE,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    color: TEXT_GREY,
    marginTop: 16,
    textAlign: 'center',
  },
});