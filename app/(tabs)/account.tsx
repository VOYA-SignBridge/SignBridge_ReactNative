import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  created_at: string;
  email: string;
  full_name: string;
  hashed_password?: string;
  id: number;
  role: string;
  supabase_id: string;
};

export default function AccountScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [appLangValue, setAppLangValue] = useState(null);
  const [focusAppLang, setFocusAppLang] = useState(false);

  const [signLangValue, setSignLangValue] = useState(null);
  const [focusSignLang, setFocusSignLang] = useState(false);

  const app_language = [
    { label: 'Vi', value: 'Vietnamese' },
    { label: 'En', value: 'English' },
    { label: 'Es', value: 'Spanish' },
    { label: 'Fr', value: 'French' },
  ];

  const sign_language = [
    { label: 'VSL', value: 'Ha Noi' },
    { label: 'ASL', value: 'American' },
    { label: 'SSL', value: 'Spanish' },
    { label: 'FSL', value: 'French' },
  ];

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("user_info");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    })();
  }, []);


  const handleLogout = () => {
    AsyncStorage.clear();
    router.replace('/auth/signin');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 25, fontWeight: 'bold' }}>
          SignBridge
        </Text>
        <Text style={[styles.text, { color: colors.text }]}>by CTU & CSIRO</Text>
      </View>

      <Text style={{ color: '#45C8C2', fontSize: 15, marginTop: 5 }}>
        An AI-based Sign language translator
      </Text>

      <Image source={require('../../assets/images/default.jpg')} style={{width: 90, height: 90, borderRadius: 50, marginTop: 30}}/>
      <Text style={[styles.text, { color: colors.text, marginTop: 10 }]}>
        {user?.full_name}
      </Text>
      <Text>
        {user?.email}
      </Text>

      <View style={styles.column}>
        <View style={[styles.divider, { backgroundColor: colors.text }]} />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Language</Text>
          <Dropdown
            style={[styles.dropdown, { backgroundColor: colors.background, borderWidth: 0 }]}
            itemTextStyle={{ color: "#000" }}
            selectedTextStyle={{ color: colors.text, fontSize: 16 }}
            placeholderStyle={{ color: '#9e9e9eff' }}
            data={app_language}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={focusAppLang ? "..." : "Select language"}
            searchPlaceholder="Search..."
            value={appLangValue}
            onFocus={() => setFocusAppLang(true)}
            onBlur={() => setFocusAppLang(false)}
            onChange={item => {
              setAppLangValue(item.value);
              setFocusAppLang(false);
              console.log(item);
            }}
            renderLeftIcon={() => (
              <Ionicons
                name="language-outline"
                size={20}
                color={focusAppLang ? colors.primary : colors.text}
                style={{ marginRight: 10 }}
              />
            )}
            renderRightIcon={() => (
              <Ionicons
                name={focusAppLang ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.text}
              />
            )}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.text }]} />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sign Language</Text>
          <Dropdown
            style={[styles.dropdown, { backgroundColor: colors.background, borderWidth: 0 }]}
            itemTextStyle={{ color: "#000" }}
            selectedTextStyle={{ color: colors.text, fontSize: 16 }}
            placeholderStyle={{ color: '#9e9e9eff' }}
            data={sign_language}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={focusSignLang ? "..." : "Select language"}
            searchPlaceholder="Search..."
            value={signLangValue}
            onFocus={() => setFocusSignLang(true)}
            onBlur={() => setFocusSignLang(false)}
            onChange={item => {
              setSignLangValue(item.value);
              setFocusSignLang(false);
              console.log(item);
            }}
            renderLeftIcon={() => (
              <Ionicons
                name="hand-right-outline"
                size={20}
                color={focusSignLang ? colors.primary : colors.text}
                style={{ marginRight: 10 }}
              />
            )}
            renderRightIcon={() => (
              <Ionicons
                name={focusSignLang ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.text}
              />
            )}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.text }]} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Toggle Theme</Text>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>
            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
          </Text>

          <Switch
            trackColor={{ false: colors.mediumGray, true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.mediumGray}
            onValueChange={toggleTheme}
            value={theme === 'dark'}
          />
        </View>

        <View style={{ width: "100%", marginTop: 25 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 20, paddingTop: 40 },
  text: { fontSize: 20, fontWeight: '600' },
  column: { width: '100%', marginTop: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  label: { fontSize: 16 },
  divider: { height: 1, width: '100%', marginVertical: 10 },
  dropdown: { height: 52, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  section: { width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
