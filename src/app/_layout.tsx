import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0B0F1A' },
          headerTintColor: '#F5F7FF',
          contentStyle: { backgroundColor: '#0B0F1A' },
        }}
      />
    </>
  );
}
