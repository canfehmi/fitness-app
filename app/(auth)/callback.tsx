import { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {
  addEventListener as linkingAddListener,
  getInitialURL,
  useLinkingURL,
} from "expo-linking";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { supabase } from "@/lib/supabase";
import {
  completeOAuthRedirect,
  navigateAfterOAuthSession,
  syncSessionFromStorageAndNavigate,
} from "@/lib/oauthSession";

export default function AuthCallback() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const { setProfile, setPreferences } = useUserStore();
  const handled = useRef(false);
  const linkingUrl = useLinkingURL();

  useEffect(() => {
    const buildDeps = () => ({
      setSession,
      setProfile,
      setPreferences,
      preferences: useUserStore.getState().preferences,
      router,
    });

    const tryUrl = async (url: string | null) => {
      if (!url || handled.current) return;
      try {
        const ok = await completeOAuthRedirect(url, buildDeps());
        if (ok) handled.current = true;
      } catch {
        /* fall through */
      }
    };

    const tryStorage = async () => {
      if (handled.current) return;
      try {
        const ok = await syncSessionFromStorageAndNavigate(buildDeps());
        if (ok) handled.current = true;
      } catch {
        /* ignore */
      }
    };

    void (async () => {
      await tryUrl(linkingUrl);
      await tryUrl(await getInitialURL());
      await tryStorage();
    })();

    const sub = linkingAddListener("url", (e) => {
      void (async () => {
        await tryUrl(e.url);
        await tryStorage();
      })();
    });

    const t = setTimeout(() => {
      void (async () => {
        await tryStorage();
        if (handled.current) return;
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setSession(data.session);
          await navigateAfterOAuthSession(data.session.user, buildDeps());
          handled.current = true;
          return;
        }
        router.replace("/(auth)/login");
      })();
    }, 5000);

    return () => {
      sub.remove();
      clearTimeout(t);
    };
  }, [linkingUrl, router, setSession, setProfile, setPreferences]);

  return (
    <View className="flex-1 bg-dark-900 items-center justify-center">
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}
