import { Redirect } from 'expo-router';

export default function EntryScreen() {
  const isAuthenticated = true; 

  if (isAuthenticated) {
    return <Redirect href="/translation" />;
  }
  
  return <Redirect href="/auth/signin" />;
}