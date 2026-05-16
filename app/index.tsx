import { Redirect } from 'expo-router';
import { useUserStore } from '@/stores/userStore';

export default function Index() {
  const { role, onboardingComplete } = useUserStore();

  if (!onboardingComplete || !role) {
    return <Redirect href="/onboarding" />;
  }

  if (role === 'visually_impaired') return <Redirect href="/buddy" />;
  if (role === 'volunteer') return <Redirect href="/volunteer" />;
  return <Redirect href="/company" />;
}
