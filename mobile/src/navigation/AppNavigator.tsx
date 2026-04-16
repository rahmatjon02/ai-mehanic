import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/auth-context';
import { theme } from '../theme';
import {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../types';

// Screens
import { DiagnosisScreen } from '../screens/DiagnosisScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OBDScreen } from '../screens/OBDScreen';
import { PricesScreen } from '../screens/PricesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { QuoteScreen } from '../screens/QuoteScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { VinScreen } from '../screens/VinScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#202020',
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            History: 'time',
            Profile: 'person-circle',
            VINTab: 'barcode',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Главная' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'История' }} />
      <Tab.Screen name="VINTab" component={VinScreen} options={{ tabBarLabel: 'VIN' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Профиль' }} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Регистрация' }}
      />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Diagnosis" component={DiagnosisScreen} options={{ title: 'Диагностика' }} />
      <Stack.Screen name="Quote" component={QuoteScreen} options={{ title: 'Проверка сметы' }} />
      <Stack.Screen name="Prices" component={PricesScreen} options={{ title: 'Цены на детали' }} />
      <Stack.Screen name="OBD" component={OBDScreen} options={{ title: 'OBD сканер' }} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return token ? <MainNavigator /> : <AuthNavigator />;
}
