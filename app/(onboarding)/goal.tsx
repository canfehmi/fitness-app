import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/stores/userStore";
import { Goal } from "@/types/database";
import { useState } from "react";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";

const GOALS: { value: Goal; emoji: string; key: string; descKey: string }[] = [
  {
    value: "lose_weight",
    emoji: "🔥",
    key: "onboarding.goal.lose_weight",
    descKey: "onboarding.goal.lose_weight_desc",
  },
  {
    value: "stay_fit",
    emoji: "💪",
    key: "onboarding.goal.stay_fit",
    descKey: "onboarding.goal.stay_fit_desc",
  },
];

export default function GoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateOnboardingData } = useUserStore();
  const [selected, setSelected] = useState<Goal | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    hapticMedium();
    updateOnboardingData({ goal: selected });
    router.push("/(onboarding)/set-selection");
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <View className="flex-1 px-6 pt-16 pb-8">
        <View className="mb-12">
          <Text className="text-primary-500 text-base font-semibold mb-2">
            1 / 3
          </Text>
          <Text className="text-white text-3xl font-bold mb-3">
            {t("onboarding.goal.title")}
          </Text>
          <Text className="text-gray-400 text-base">
            {t("onboarding.goal.subtitle")}
          </Text>
        </View>

        <View className="gap-4">
          {GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.value}
              onPress={() => {
                hapticLight();
                setSelected(goal.value);
              }}
              className={`rounded-2xl p-6 border-2 ${
                selected === goal.value
                  ? "bg-primary-500/10 border-primary-500"
                  : "bg-dark-700 border-dark-600"
              }`}
            >
              <Text className="text-4xl mb-3">{goal.emoji}</Text>
              <Text
                className={`text-xl font-bold mb-1 ${selected === goal.value ? "text-primary-400" : "text-white"}`}
              >
                {t(goal.key)}
              </Text>
              <Text className="text-gray-400 text-sm">{t(goal.descKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-auto">
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
        </View>
      </View>
    </SafeAreaView>
  );
}
