// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext'; // <-- Import hook

export default function TabsLayout() {
  // Lấy ra màu sắc động từ context
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        
        // === ÁP DỤNG MÀU ĐỘNG ===
        tabBarActiveTintColor: colors.tabIconSelected, // <-- Đổi
        tabBarInactiveTintColor: colors.tabIconDefault, // <-- Đổi
        tabBarStyle: {
          backgroundColor: colors.background, // <-- Đổi màu nền Tab bar
          borderTopColor: colors.textInputBG, // (Ví dụ, dùng màu nền input)
        },
      }}
    >
      <Tabs.Screen
        name="translation"
        options={{
          title: 'Translation',
          tabBarIcon: ({ color }) => (
            <Ionicons name="language-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="text_to_vid"
        options={{
          title: 'Text to Vid',
          tabBarIcon: ({ color }) => (
            <Ionicons name="text" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversation"
        options={{
          title: 'Conversation',
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="avatar"
        options={{
          title: 'Avatar',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}