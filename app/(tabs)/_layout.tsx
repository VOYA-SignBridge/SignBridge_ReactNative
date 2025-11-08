// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3F51B5',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#ddd',
          paddingBottom: 2,
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