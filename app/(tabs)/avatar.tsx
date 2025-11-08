import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AvatarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Avatar Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
});