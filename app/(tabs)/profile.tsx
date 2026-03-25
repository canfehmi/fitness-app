import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import i18n from "@/lib/i18n";
import {
  formatHeightCmDisplay,
  formatKgDisplay,
} from "@/lib/userPreferencesMetrics";
import {
  profileGoalLabelTr,
  levelPlanLabelTr,
} from "@/lib/fitnessDisplay";
import { hapticLight, hapticMedium, hapticSelection, hapticWarning } from "@/lib/haptics";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuthStore();
  const { profile, preferences } = useUserStore();
  const needsGoalSetup = !preferences?.goal || !preferences?.level;

  const handleSignOut = () => {
    hapticLight();
    Alert.alert(
      t("profile.sign_out"),
      "Çıkış yapmak istediğine emin misin?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.sign_out"),
          style: "destructive",
          onPress: () => {
            hapticWarning();
            signOut();
          },
        },
      ],
    );
  };

  const handleLanguageChange = (lang: "tr" | "en") => {
    hapticSelection();
    i18n.changeLanguage(lang);
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingTop: 48 }}
      >
        {/* Header */}
        <Text className="text-white text-3xl font-bold mb-8">
          {t("profile.title")}
        </Text>

        {/* Avatar & Name */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-primary-500/20 border-2 border-primary-500 items-center justify-center mb-4">
            <Text className="text-4xl">
              {profile?.full_name?.charAt(0).toUpperCase() ?? "👤"}
            </Text>
          </View>
          <Text className="text-white text-2xl font-bold">
            {profile?.full_name ?? "Kullanıcı"}
          </Text>
        </View>

        {/* Info Cards */}
        <View className="bg-dark-700 rounded-3xl p-6 border border-dark-600 mb-4">
          <Text className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">
            Koç Profilin
          </Text>
          <InfoRow
            label={t("profile.goal")}
            value={profileGoalLabelTr(preferences?.goal)}
          />
          <InfoRow
            label={t("profile.plan")}
            value={levelPlanLabelTr(preferences?.level)}
          />
          <InfoRow
            label="Mevcut Kilo"
            value={formatKgDisplay(preferences?.current_weight)}
          />
          <InfoRow
            label="Hedef Kilo"
            value={formatKgDisplay(preferences?.target_weight)}
          />
          <InfoRow
            label="Boy"
            value={formatHeightCmDisplay(preferences?.height_cm)}
            isLast
          />
        </View>

        {needsGoalSetup && (
          <View className="bg-dark-700 rounded-3xl p-5 border border-primary-500/25 mb-4">
            <Text className="text-primary-400 text-xs font-semibold uppercase tracking-wide mb-2">
              Koç Önerisi
            </Text>
            <Text className="text-white text-sm leading-5 mb-4">
              Hedefini güncellediğinde planın ve günlük önerilerin sana daha iyi uyum sağlar.
            </Text>
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                router.push("/(onboarding)/goal");
              }}
              className="bg-primary-500 rounded-2xl py-3 items-center"
            >
              <Text className="text-white font-bold text-sm">Hedefini güncelle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Language */}
        <View className="bg-dark-700 rounded-3xl p-6 border border-dark-600 mb-4">
          <Text className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">
            {t("profile.language")}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => handleLanguageChange("tr")}
              className={`flex-1 rounded-2xl py-3 items-center border ${
                i18n.language === "tr"
                  ? "bg-primary-500/20 border-primary-500"
                  : "bg-dark-600 border-dark-600"
              }`}
            >
              <Text
                className={`font-semibold ${
                  i18n.language === "tr" ? "text-primary-400" : "text-gray-400"
                }`}
              >
                🇹🇷 Türkçe
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleLanguageChange("en")}
              className={`flex-1 rounded-2xl py-3 items-center border ${
                i18n.language === "en"
                  ? "bg-primary-500/20 border-primary-500"
                  : "bg-dark-600 border-dark-600"
              }`}
            >
              <Text
                className={`font-semibold ${
                  i18n.language === "en" ? "text-primary-400" : "text-gray-400"
                }`}
              >
                🇬🇧 English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-red-500/10 border border-red-500/30 rounded-3xl py-4 items-center mt-2"
        >
          <Text className="text-red-400 text-base font-bold">
            {t("profile.sign_out")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        !isLast ? "border-b border-dark-600" : ""
      }`}
    >
      <Text className="text-gray-400 text-sm">{label}</Text>
      <Text className="text-white font-semibold text-sm">{value}</Text>
    </View>
  );
}
