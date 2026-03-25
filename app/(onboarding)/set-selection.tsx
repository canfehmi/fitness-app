import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/stores/userStore";
import { Level } from "@/types/database";
import { useState } from "react";
import { hapticLight, hapticMedium } from "@/lib/haptics";

/** Backend `level` + günlük toplam süre (dakika). Kullanıcıya sadece Kolay/Orta/Zor gösterilir. */
const PLANS: {
  value: Level;
  emoji: string;
  totalMinutes: number;
  titleKey: string;
  hintKey: string;
  selectedBorder: string;
  selectedBg: string;
}[] = [
  {
    value: "15min_1set",
    emoji: "🟢",
    totalMinutes: 15,
    titleKey: "tier_easy",
    hintKey: "tier_easy_hint",
    selectedBorder: "border-green-500",
    selectedBg: "bg-green-500/10",
  },
  {
    value: "30min_1set",
    emoji: "🟡",
    totalMinutes: 30,
    titleKey: "tier_medium",
    hintKey: "tier_medium_hint",
    selectedBorder: "border-yellow-500",
    selectedBg: "bg-yellow-500/10",
  },
  {
    value: "30min_2set",
    emoji: "🔴",
    totalMinutes: 60,
    titleKey: "tier_hard",
    hintKey: "tier_hard_hint",
    selectedBorder: "border-red-500",
    selectedBg: "bg-red-500/10",
  },
];

export default function SetSelectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateOnboardingData } = useUserStore();
  const [selected, setSelected] = useState<Level | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    hapticMedium();
    const plan = PLANS.find((p) => p.value === selected)!;
    updateOnboardingData({
      level: selected,
      preferred_minutes: plan.totalMinutes,
    });
    router.push("/(onboarding)/body-info");
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <View className="flex-1 px-6 pt-16 pb-8">
        <View className="mb-10">
          <Text className="text-primary-500 text-base font-semibold mb-2">
            2 / 3
          </Text>
          <Text className="text-white text-3xl font-bold mb-3">
            {t("onboarding.set_selection.title")}
          </Text>
          <Text className="text-gray-400 text-base leading-relaxed">
            {t("onboarding.set_selection.subtitle")}
          </Text>
        </View>

        <View className="gap-3">
          {PLANS.map((plan) => {
            const isOn = selected === plan.value;
            return (
              <TouchableOpacity
                key={plan.value}
                onPress={() => {
                  hapticLight();
                  setSelected(plan.value);
                }}
                className={`rounded-2xl p-5 border-2 flex-row items-center ${
                  isOn
                    ? `${plan.selectedBorder} ${plan.selectedBg}`
                    : "border-dark-600 bg-dark-700"
                }`}
              >
                <Text className="text-3xl mr-3">{plan.emoji}</Text>
                <View className="flex-1">
                  <Text
                    className={`text-lg font-bold ${isOn ? "text-white" : "text-white"}`}
                  >
                    {t(`onboarding.set_selection.${plan.titleKey}`)}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1 leading-5">
                    {t(`onboarding.set_selection.${plan.hintKey}`)}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isOn ? "border-white/80 bg-white/20" : "border-gray-600"
                  }`}
                >
                  {isOn && <Text className="text-white text-xs">✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="mt-auto gap-3">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!selected}
            className={`rounded-2xl py-4 items-center ${selected ? "bg-primary-500" : "bg-dark-600"}`}
          >
            <Text
              className={`text-base font-bold ${selected ? "text-white" : "text-gray-500"}`}
            >
              {t("common.continue")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="py-3 items-center"
          >
            <Text className="text-gray-400 text-base">{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
