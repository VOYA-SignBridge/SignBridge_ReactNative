import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [index, setIndex] = useState(0);

  const screens = [
    <Text key="translation" style={styles.screenText}>Translation Screen</Text>,
    <Text key="conversation" style={styles.screenText}>Conversation Screen</Text>,
    <Text key="avatar" style={styles.screenText}>Avatar Screen</Text>,
    <Text key="account" style={styles.screenText}>Account Screen</Text>,
  ];

  const tabs = [
    { label: 'Translate', icon: 'language-outline' },
    { label: 'Chat', icon: 'chatbubble-ellipses-outline' },
    { label: 'Avatar', icon: 'person-outline' },
    { label: 'Account', icon: 'settings-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.body}>{screens[index]}</View>

      <View style={styles.nav}>
        {tabs.map((tab, i) => {
          const active = i === index;
          return (
            <TouchableOpacity key={i} onPress={() => setIndex(i)} style={styles.tab}>
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={active ? '#3F51B5' : '#999'}
              />
              <Text style={[styles.label, { color: active ? '#3F51B5' : '#999' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenText: { fontSize: 20, fontWeight: '600', color: '#333' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 10,
  },
  tab: { alignItems: 'center' },
  label: { fontSize: 12, marginTop: 4, fontWeight: '500' },
});
