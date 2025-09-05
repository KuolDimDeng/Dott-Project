import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IS_STAGING, IS_LOCAL } from '../config/environment';

const EnvironmentBadge = () => {
  if (!IS_STAGING && !IS_LOCAL) {
    return null; // Don't show badge in production
  }

  const label = IS_STAGING ? 'STAGING' : 'LOCAL';
  const backgroundColor = IS_STAGING ? '#FFA500' : '#FF0000';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default EnvironmentBadge;