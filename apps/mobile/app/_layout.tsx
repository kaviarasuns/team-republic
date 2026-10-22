import "../global.css";

import { RegistryProvider } from "@effect/atom-react";
import { configureApiBaseUrl, labels } from "@team-republic/client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LocaleProvider, useLocale } from "../src/locale-context";

configureApiBaseUrl(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000");

const HeaderLocaleToggle = () => {
  const { locale, toggleLocale } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labels[locale].language}
      className="min-h-11 min-w-11 items-center justify-center px-3 active:opacity-70"
      onPress={toggleLocale}
    >
      <Text className="text-base font-medium text-neutral-900 dark:text-neutral-100">
        {labels[locale].language}
      </Text>
    </Pressable>
  );
};

const RootNavigator = () => {
  const { locale } = useLocale();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerRight: () => <HeaderLocaleToggle />,
          headerTitleStyle: { fontFamily: undefined },
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ title: labels[locale].constituencies }} />
        <Stack.Screen name="constituency/[id]" options={{ title: labels[locale].results }} />
      </Stack>
    </>
  );
};

export default function RootLayout() {
  return (
    <RegistryProvider>
      <SafeAreaProvider>
        <LocaleProvider>
          <RootNavigator />
        </LocaleProvider>
      </SafeAreaProvider>
    </RegistryProvider>
  );
}
