import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = 'auth.dottapps.com';
const AUTH0_CLIENT_ID = '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF';

const TestAuthScreen = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testRedirectUris = async () => {
    addLog('🧪 Testing different redirect URIs...');
    
    const uris = [
      'dott://redirect',
      'exp://localhost:8081',
      'exp://localhost:8081/--/redirect',
      'exp://10.0.0.96:8081',
      'exp://10.0.0.96:8081/--/redirect',
      AuthSession.makeRedirectUri({ scheme: 'dott' }),
      AuthSession.makeRedirectUri({ scheme: 'dott', path: 'redirect' }),
      AuthSession.makeRedirectUri({ scheme: 'exp' }),
      AuthSession.makeRedirectUri({ preferLocalhost: true }),
      AuthSession.makeRedirectUri({ preferLocalhost: false }),
    ];
    
    uris.forEach((uri, index) => {
      addLog(`URI ${index + 1}: ${uri}`);
    });
  };

  const testSimpleAuth = async (redirectUri: string) => {
    try {
      addLog(`\n🔵 Testing with redirect URI: ${redirectUri}`);
      
      const authUrl = `https://${AUTH0_DOMAIN}/authorize?` + 
        `client_id=${AUTH0_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('openid profile email')}`;

      addLog('🔵 Opening browser...');
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      addLog(`🔵 Result type: ${result.type}`);
      
      if (result.type === 'success' && result.url) {
        addLog(`✅ Success! URL: ${result.url.substring(0, 100)}...`);
        
        if (result.url.includes('error=')) {
          const errorMatch = result.url.match(/error=([^&]+)/);
          const errorDescMatch = result.url.match(/error_description=([^&]+)/);
          addLog(`❌ Auth0 Error: ${errorMatch?.[1]}`);
          addLog(`❌ Description: ${errorDescMatch ? decodeURIComponent(errorDescMatch[1]) : 'none'}`);
        }
      } else if (result.type === 'cancel') {
        addLog('⚠️ User cancelled');
      } else {
        addLog(`❌ Failed with type: ${result.type}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Auth0 Test Screen</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
          <Text style={styles.clearButtonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testRedirectUris}
        >
          <Text style={styles.buttonText}>Show All Redirect URIs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => testSimpleAuth('dott://redirect')}
        >
          <Text style={styles.buttonText}>Test dott://redirect</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => testSimpleAuth(AuthSession.makeRedirectUri({ scheme: 'exp' }))}
        >
          <Text style={styles.buttonText}>Test Expo Redirect</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => testSimpleAuth('exp://localhost:8081')}
        >
          <Text style={styles.buttonText}>Test exp://localhost:8081</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => testSimpleAuth('exp://localhost:8081/--/redirect')}
        >
          <Text style={styles.buttonText}>Test exp://localhost:8081/--/redirect</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logs}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#2563eb',
  },
  buttons: {
    padding: 20,
    gap: 10,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logs: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1e293b',
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
});

export default TestAuthScreen;