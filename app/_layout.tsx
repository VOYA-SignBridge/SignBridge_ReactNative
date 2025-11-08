// app/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'; // <-- Import
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    // Bọc toàn bộ ứng dụng
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

// Tách ra component riêng để có thể dùng hook 'useTheme'
function ThemedRoot() {
  // Hook này bây giờ sẽ hoạt động vì nó nằm bên trong ThemeProvider
  const { theme } = useTheme(); 
  
  return (
    <>
      {/* Tự động đổi màu chữ trên Status Bar (đồng hồ, pin...) */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
      </Stack>
    </>
  );
}