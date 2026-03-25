import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/stores/userStore";
import { useAuthStore } from "@/stores/authStore";
import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { persistOnboardingCompletion } from "@/lib/completeOnboarding";
import { weeklyFatPreview } from "@/lib/onboardingBodyPreview";
import i18n from "@/lib/i18n";
import {
  hapticError,
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/haptics";
import {
  validateBodyInfo,
  hasErrors,
  type BodyInfoErrors,
} from "@/lib/bodyInfoValidation";

export default function BodyInfoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateOnboardingData, preferences, setProfile, setPreferences } =
    useUserStore();
  const { session } = useAuthStore();

  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [height, setHeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = useCallback(
    (field: string) => setTouched((prev) => ({ ...prev, [field]: true })),
    [],
  );

  const errors: BodyInfoErrors = useMemo(
    () =>
      validateBodyInfo(
        { currentWeight, targetWeight, height },
        preferences?.goal,
      ),
    [currentWeight, targetWeight, height, preferences?.goal],
  );

  const shouldShow = (field: keyof BodyInfoErrors) =>
    (submitted || touched[field] || allFilled) && errors[field];

  const allFilled =
    currentWeight.length > 0 &&
    targetWeight.length > 0 &&
    height.length > 0 &&
    !isNaN(Number(currentWeight)) &&
    !isNaN(Number(targetWeight)) &&
    !isNaN(Number(height));

  const isValid = allFilled && !hasErrors(errors);

  const fatPreview = useMemo(
    () =>
      weeklyFatPreview(
        preferences?.goal ?? null,
        currentWeight ? Number(currentWeight) : undefined,
        targetWeight ? Number(targetWeight) : undefined,
      ),
    [preferences?.goal, currentWeight, targetWeight],
  );

  const fatLine = useMemo(() => {
    const fmt = (n: number) =>
      n.toLocaleString(i18n.language?.startsWith("tr") ? "tr-TR" : "en-US", {
        maximumFractionDigits: 1,
      });
    switch (fatPreview.kind) {
      case "lose_range":
        return t("onboarding.body_info.preview_fat_range", {
          min: fmt(fatPreview.min),
          max: fmt(fatPreview.max),
        });
      case "lose_generic":
        return t("onboarding.body_info.preview_fat_generic");
      case "stay_fit":
        return t("onboarding.body_info.preview_stay_fit_line");
      case "maintain":
        return t("onboarding.body_info.preview_maintain_line");
    }
  }, [fatPreview, t, i18n.language]);

  const durationLine = useMemo(() => {
    const m = preferences?.preferred_minutes;
    if (m != null && Number.isFinite(m)) {
      return t("onboarding.body_info.preview_duration_value", {
        minutes: Math.round(m),
      });
    }
    return t("onboarding.body_info.preview_duration_fallback");
  }, [preferences?.preferred_minutes, t]);

  const handleContinue = async () => {
    setSubmitted(true);
    if (!isValid) {
      if (hasErrors(errors)) hapticError();
      return;
    }
    hapticLight();

    const cw = Number(currentWeight);
    const tw = Number(targetWeight);
    const h = Number(height);

    updateOnboardingData({
      current_weight: cw,
      target_weight: tw,
      height_cm: h,
    });

    const prefs = {
      goal: preferences?.goal ?? null,
      level: preferences?.level ?? null,
      preferred_minutes: preferences?.preferred_minutes ?? null,
      current_weight: cw,
      target_weight: tw,
      height_cm: h,
    };

    const { data: authData } = await supabase.auth.getSession();
    const user = authData.session?.user ?? session?.user;

    if (user) {
      setSaving(true);
      try {
        await persistOnboardingCompletion(user.id, prefs);
        const [{ data: profile }, { data: prefRow }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        if (profile) setProfile(profile as any);
        if (prefRow) setPreferences(prefRow as any);
        hapticSuccess();
        router.replace("/(tabs)");
      } catch (e: any) {
        hapticError();
        Alert.alert(
          t("common.error_title"),
          e?.message ?? t("common.error"),
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    hapticMedium();
    router.push("/(auth)/login");
  };

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
              <Text className="text-primary-500 text-base font-semibold mb-2">
                3 / 3
              </Text>
              <Text className="text-white text-3xl font-bold mb-3">
                {t("onboarding.body_info.title")}
              </Text>
              <Text className="text-gray-400 text-base leading-relaxed">
                {t("onboarding.body_info.subtitle")}
              </Text>
            </View>

            <View className="mb-8 rounded-2xl border border-primary-500/30 bg-dark-700/90 p-4">
              <Text className="text-white text-base font-bold leading-snug mb-4">
                {t("onboarding.body_info.personalized_title")}
              </Text>
              <View className="gap-3">
                <View className="flex-row gap-3">
                  <Text className="text-lg">🔥</Text>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-0.5">
                      {t("onboarding.body_info.preview_fat_label")}
                    </Text>
                    <Text className="text-primary-300 text-sm font-semibold leading-5">
                      {fatLine}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-3 border-t border-dark-600 pt-3">
                  <Text className="text-lg">⏱</Text>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-0.5">
                      {t("onboarding.body_info.preview_duration_label")}
                    </Text>
                    <Text className="text-white text-sm font-semibold leading-5">
                      {durationLine}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="gap-4">
              <InputField
                label={t("onboarding.body_info.current_weight")}
                value={currentWeight}
                onChangeText={setCurrentWeight}
                onBlur={() => markTouched("currentWeight")}
                placeholder="70"
                unit="kg"
                error={shouldShow("currentWeight") ? t(errors.currentWeight!) : undefined}
              />
              <InputField
                label={t("onboarding.body_info.target_weight")}
                value={targetWeight}
                onChangeText={setTargetWeight}
                onBlur={() => markTouched("targetWeight")}
                placeholder="65"
                unit="kg"
                error={shouldShow("targetWeight") ? t(errors.targetWeight!) : undefined}
              />
              <InputField
                label={t("onboarding.body_info.height")}
                value={height}
                onChangeText={setHeight}
                onBlur={() => markTouched("height")}
                placeholder="175"
                unit="cm"
                error={shouldShow("height") ? t(errors.height!) : undefined}
              />
            </View>

            <View className="mt-auto pt-8 gap-3">
              <TouchableOpacity
                onPress={handleContinue}
                disabled={saving}
                activeOpacity={allFilled && !saving ? 0.7 : 1}
                className={`rounded-2xl py-4 items-center ${isValid && !saving ? "bg-primary-500" : "bg-dark-600"}`}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    className={`text-base font-bold ${isValid ? "text-white" : "text-gray-500"}`}
                  >
                    {t("common.continue")}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={saving}
                className="py-3 items-center"
              >
                <Text className="text-gray-400 text-base">
                  {t("common.back")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function sanitizeIntegerInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 0) return "";
  return String(Number(digits));
}

function InputField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  unit,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  unit: string;
  error?: string;
}) {
  const handleChange = (raw: string) => onChangeText(sanitizeIntegerInput(raw));

  return (
    <View>
      <Text className="text-gray-400 text-sm mb-2">{label}</Text>
      <View
        className={`flex-row items-center bg-dark-700 rounded-2xl border px-4 ${
          error ? "border-red-500" : "border-dark-600"
        }`}
      >
        <TextInput
          value={value}
          onChangeText={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor="#4b5563"
          keyboardType="number-pad"
          maxLength={4}
          className="flex-1 text-white text-lg py-4"
        />
        <Text className="text-gray-400 text-base font-semibold">{unit}</Text>
      </View>
      {error && (
        <Text className="text-red-400 text-xs mt-1.5 leading-4">{error}</Text>
      )}
    </View>
  );
}
