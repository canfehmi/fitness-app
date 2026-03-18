import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Database } from "@/types/database";
import { useUserStore } from "@/stores/userStore";
import { supabase } from "@/lib/supabase";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type PreferencesInsert =
  Database["public"]["Tables"]["user_preferences"]["Insert"];

type Mode = "login" | "register";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { preferences, updateOnboardingData } = useUserStore();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    setIsLoading(true);

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await setupNewUser(data.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          await checkAndRoute(data.user.id);
        }
      }
    } catch (err: any) {
      Alert.alert("Hata", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setupNewUser = async (userId: string) => {
    await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName || null,
      onboarding_completed: true,
      preferred_language: "tr",
    } as any);

    await supabase.from("user_preferences").upsert({
      user_id: userId,
      goal: preferences?.goal ?? null,
      level: preferences?.level ?? null,
      preferred_minutes: preferences?.preferred_minutes ?? null,
      current_weight: preferences?.current_weight ?? null,
      target_weight: preferences?.target_weight ?? null,
      height_cm: preferences?.height_cm ?? null,
    } as any);

    router.replace("/(tabs)");
  };

  const checkAndRoute = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .single();

    const profile = data as
      | Database["public"]["Tables"]["profiles"]["Row"]
      | null;

    if (profile?.onboarding_completed) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(onboarding)/goal");
    }
  };

  const isValid =
    mode === "register"
      ? email.length > 0 && password.length >= 6
      : email.length > 0 && password.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-16 pb-8">
            {/* Header */}
            <View className="mb-10">
              <Text className="text-4xl mb-3">🏋️</Text>
              <Text className="text-white text-3xl font-bold mb-3">
                {mode === "login" ? t("auth.login") : t("auth.register")}
              </Text>
              <Text className="text-gray-400 text-base">
                {mode === "login"
                  ? t("auth.no_account")
                  : t("auth.have_account")}
                {"  "}
                <Text
                  className="text-primary-500 font-semibold"
                  onPress={() =>
                    setMode(mode === "login" ? "register" : "login")
                  }
                >
                  {mode === "login" ? t("auth.register") : t("auth.login")}
                </Text>
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              {mode === "register" && (
                <View>
                  <Text className="text-gray-400 text-sm mb-2">
                    {t("auth.full_name")}
                  </Text>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="John Doe"
                    placeholderTextColor="#4b5563"
                    autoCapitalize="words"
                    className="bg-dark-700 border border-dark-600 rounded-2xl px-4 py-4 text-white text-base"
                  />
                </View>
              )}

              <View>
                <Text className="text-gray-400 text-sm mb-2">
                  {t("auth.email")}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@email.com"
                  placeholderTextColor="#4b5563"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="bg-dark-700 border border-dark-600 rounded-2xl px-4 py-4 text-white text-base"
                />
              </View>

              <View>
                <Text className="text-gray-400 text-sm mb-2">
                  {t("auth.password")}
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#4b5563"
                  secureTextEntry
                  className="bg-dark-700 border border-dark-600 rounded-2xl px-4 py-4 text-white text-base"
                />
              </View>
            </View>

            {/* Buttons */}
            <View className="mt-8 gap-3">
              {/* Email Button */}
              <TouchableOpacity
                onPress={handleEmailAuth}
                disabled={!isValid || isLoading}
                className={`rounded-2xl py-4 items-center ${
                  isValid && !isLoading ? "bg-primary-500" : "bg-dark-600"
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    className={`text-base font-bold ${
                      isValid ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {mode === "login" ? t("auth.login") : t("auth.register")}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View className="flex-row items-center gap-3 my-2">
                <View className="flex-1 h-px bg-dark-600" />
                <Text className="text-gray-500 text-sm">veya</Text>
                <View className="flex-1 h-px bg-dark-600" />
              </View>

              {/* Google Button */}
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Yakında", "Google ile giriş yakında eklenecek")
                }
                className="rounded-2xl py-4 items-center flex-row justify-center gap-3 bg-dark-700 border border-dark-600"
              >
                <Text className="text-2xl">🇬</Text>
                <Text className="text-white text-base font-semibold">
                  {t("auth.google_login")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
