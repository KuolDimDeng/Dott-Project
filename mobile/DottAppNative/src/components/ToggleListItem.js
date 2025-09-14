import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * Reusable toggle list item component for consistent layout
 * Ensures toggles never go off-screen and provides a native mobile pattern
 */
export default function ToggleListItem({
  title,
  subtitle,
  icon,
  value,
  onValueChange,
  disabled = false,
  showSeparator = true,
  indent = false,
  children,
  onPress,
}) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <View style={[styles.container, indent && styles.indented]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        disabled={disabled && !onPress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {/* Left side: Icon and Labels */}
          <View style={styles.labelContainer}>
            {icon && (
              <Icon
                name={icon}
                size={20}
                color={disabled ? '#94a3b8' : '#475569'}
                style={styles.icon}
              />
            )}
            <View style={styles.textContainer}>
              <Text style={[
                styles.title,
                disabled && styles.disabledText
              ]}>
                {title}
              </Text>
              {subtitle && (
                <Text style={[
                  styles.subtitle,
                  disabled && styles.disabledText
                ]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {/* Right side: Toggle */}
          <View style={styles.toggleContainer}>
            <Switch
              value={value}
              onValueChange={onValueChange}
              disabled={disabled}
              trackColor={{
                false: '#cbd5e1',
                true: '#34d399'
              }}
              thumbColor={
                Platform.OS === 'ios'
                  ? '#ffffff'
                  : value ? '#10b981' : '#f3f4f6'
              }
              ios_backgroundColor="#cbd5e1"
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Children (sub-options) */}
      {children && value && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}

      {/* Separator */}
      {showSeparator && <View style={styles.separator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  indented: {
    marginLeft: 16,
  },
  touchable: {
    minHeight: 56,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1f2937',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 18,
  },
  disabledText: {
    color: '#94a3b8',
  },
  toggleContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
  childrenContainer: {
    backgroundColor: '#f9fafb',
    paddingLeft: 16,
    paddingVertical: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 16,
  },
});