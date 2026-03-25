import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/stores/userStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import {
  completeOAuthRedirect,
  syncSessionFromStorageAndNavigate,
} from "@/lib/oauthSession";
import { getOAuthRedirectUri } from "@/lib/oauthRedirect";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  mergeOnboardingPreferences,
} from "@/lib/onboardingDraft";
import {
  metricsForUpsert,
  parsePreferredMinutes,
} from "@/lib/userPreferencesMetrics";
import * as WebBrowser from "expo-web-browser";
import {
  hapticError,
  hapticLight,
  hapticSelection,
  hapticSuccess,
} from "@/lib/haptics";

WebBrowser.maybeCompleteAuthSession();

type Mode = "login" | "register";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { preferences, setProfile, setPreferences } = useUserStore();
  const { setSession } = useAuthStore();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadUserDataAndGo = async (userId: string) => {
    const [{ data: profile }, { data: prefs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single(),
    ]);
    if (profile) setProfile(profile as any);
    if (prefs) setPreferences(prefs as any);

    const p = profile as { onboarding_completed: boolean } | null;
    if (p?.onboarding_completed) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(onboarding)/goal");
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    hapticLight();
    setIsLoading(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await setupNewUser(data.user.id);
          setSession(data.session);
          hapticSuccess();
          await loadUserDataAndGo(data.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setSession(data.session);
          hapticSuccess();
          await loadUserDataAndGo(data.user.id);
        }
      }
    } catch (err: any) {
      hapticError();
      Alert.alert(t("common.error_title"), err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    hapticLight();
    setIsLoading(true);
    try {
      const redirectTo = getOAuthRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
        );

        if (result.type === "success" && result.url) {
          const deps = {
            setSession,
            setProfile,
            setPreferences,
            preferences: useUserStore.getState().preferences,
            router,
          };
          const oauthDone = (async () => {
            const ok = await completeOAuthRedirect(result.url, deps);
            if (!ok) {
              await syncSessionFromStorageAndNavigate(deps);
            }
          })();
          await Promise.race([
            oauthDone,
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Bağlantı zaman aşımına uğradı. Tekrar deneyin.")),
                25000,
              ),
            ),
          ]);
        }
      }
    } catch (err: any) {
      hapticError();
      Alert.alert(t("common.error_title"), err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setupNewUser = async (userId: string) => {
    const draft = await loadOnboardingDraft();
    const merged = mergeOnboardingPreferences(preferences, draft);

    const { error: pErr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName || null,
        onboarding_completed: true,
        preferred_language: "tr",
      } as any,
      { onConflict: "id" },
    );
    if (pErr) throw pErr;
    const m = metricsForUpsert(merged);
    const { error: uErr } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        goal: merged.goal,
        level: merged.level,
        preferred_minutes: parsePreferredMinutes(merged.preferred_minutes),
        current_weight: m.current_weight,
        target_weight: m.target_weight,
        height_cm: m.height_cm,
      } as any,
      { onConflict: "user_id" },
    );
    if (uErr) throw uErr;
    await clearOnboardingDraft();
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
                  onPress={() => {
                    hapticSelection();
                    setMode(mode === "login" ? "register" : "login");
                  }}
                >
                  {mode === "login" ? t("auth.register") : t("auth.login")}
                </Text>
              </Text>
            </View>

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

            <View className="mt-8 gap-3">
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
                    className={`text-base font-bold ${isValid ? "text-white" : "text-gray-500"}`}
                  >
                    {mode === "login" ? t("auth.login") : t("auth.register")}
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center gap-3 my-2">
                <View className="flex-1 h-px bg-dark-600" />
                <Text className="text-gray-500 text-sm">veya</Text>
                <View className="flex-1 h-px bg-dark-600" />
              </View>

              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={isLoading}
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
