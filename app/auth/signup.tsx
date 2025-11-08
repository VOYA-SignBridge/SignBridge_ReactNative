import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { supabase } from '@/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSignUp = async () => {
    if (!email || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill out all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match');
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Account created! Please sign in.');
      router.replace('/auth/signin');
    }
  };

  return (
    <LinearGradient colors={['#000000', '#000000']} style={styles.container}>
      <Image source={require('../../assets/images/logo1.png')} style={styles.logo} />
      <Text style={styles.subtitle}>An AI-based Sign Language Translator</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#ccc"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#ccc"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#ccc"
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <Link href="/auth/signin" asChild>
        <TouchableOpacity>
          <Text style={styles.link}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </Link>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { height: 180, width: 180, marginBottom: 16 },
  subtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    color: '#fff',
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  buttonText: { color: '#3F51B5', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#eee', marginTop: 16 },
});
