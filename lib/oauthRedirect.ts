import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

/** Supabase Redirect URLs listesine de aynı string eklenmeli. */
const NATIVE_OAUTH_REDIRECT = "fitnessapp://(auth)/callback";

/**
 * `app/(auth)/callback.tsx` ile eşleşen derin bağlantı.
 *
 * Android/iOS'ta `makeRedirectUri` / `Linking.createURL` bazen Metro nedeniyle
 * `localhost:3000` üretebilir; native'de sabit şema kullanıyoruz.
 */
export function getOAuthRedirectUri(): string {
  if (Platform.OS === "web") {
    return AuthSession.makeRedirectUri({
      scheme: "fitnessapp",
      path: "(auth)/callback",
    });
  }
  return NATIVE_OAUTH_REDIRECT;
}
