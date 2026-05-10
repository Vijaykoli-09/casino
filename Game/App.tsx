import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      // Add any async startup logic here
      // e.g. check stored token, load fonts, etc.
      setReady(true);
    } catch (e: any) {
      setError(e.message ?? 'Startup failed');
    }
  };

  if (error) {
    return (
      <View style={{
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#0A0A0A', padding: 24,
      }}>
        <Text style={{ color: '#C9A84C', fontSize: 14, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#0A0A0A',
      }}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return <AppNavigator />;
}