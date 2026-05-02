import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import GameScreen from '../screens/GameScreen';
import BetHistoryScreen from '../screens/BetHistoryScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminUserDetailScreen from '../screens/AdminUserDetailScreen';
import SuperAdminScreen from '../screens/SuperAdminScreen';
import SuperAdminDetailScreen from '../screens/SuperAdminDetailScreen';
import PasscodeScreen from '../screens/PasscodeScreen';

export type RootStackParamList = {
  Splash:              undefined;
  Login:               undefined;
  Game:                undefined;
  BetHistory:          undefined;
  Admin:               undefined;
  AdminUserDetail: {
    userId:   number;
    username: string;
    balance:  number;
  };
  Passcode: {
    tempToken: string;
  };
  SuperAdmin:          undefined;
  SuperAdminDetail: {
    adminId:  number;
    username: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Splash"           component={SplashScreen} />
        <Stack.Screen name="Login"            component={LoginScreen} />
        <Stack.Screen name="Passcode"         component={PasscodeScreen} />
        <Stack.Screen name="Game"             component={GameScreen} />
        <Stack.Screen name="BetHistory"       component={BetHistoryScreen} />
        <Stack.Screen name="Admin"            component={AdminScreen} />
        <Stack.Screen name="AdminUserDetail"  component={AdminUserDetailScreen} />
        <Stack.Screen name="SuperAdmin"       component={SuperAdminScreen} />
        <Stack.Screen name="SuperAdminDetail" component={SuperAdminDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}