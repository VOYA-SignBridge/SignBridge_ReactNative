// app/(tabs)/account.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext'; // <-- Import hook

export default function AccountScreen() {
  // Lấy ra theme hiện tại, hàm toggle, và bộ màu
  const { theme, toggleTheme, colors } = useTheme();

  return (
    // Dùng màu nền động
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Dùng màu chữ động */}
      <Text style={[styles.text, { color: colors.text }]}>Account Screen</Text>

      {/* === NÚT TOGGLE THEME === */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>
          {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
        </Text>
        <Switch
          trackColor={{ false: colors.mediumGray, true: colors.primary }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.mediumGray}
          onValueChange={toggleTheme} // Gọi hàm toggle
          value={theme === 'dark'} // Giá trị switch
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
  },
});