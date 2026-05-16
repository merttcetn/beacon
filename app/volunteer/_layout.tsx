import { Stack } from 'expo-router';

export default function VolunteerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="feedback" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="timeline" />
      <Stack.Screen name="ticket/new" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="pin/[id]" />
    </Stack>
  );
}
