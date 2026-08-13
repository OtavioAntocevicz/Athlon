import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import {
  BackHandler,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as SplashScreen from "expo-splash-screen";

/** Compatibilidade de tipos react-native-webview + React 18 no monorepo. */
const NativeWebView = WebView as unknown as ComponentType<Record<string, unknown>>;

type WebViewHandle = { goBack: () => void };

/** URL do frontend em produção. Sobrescreva com EXPO_PUBLIC_APP_URL no .env local. */
const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? "https://athlonsport.app.br";

/** Sufixo reconhecido pelo frontend (lib/is-athlon-app.ts). */
const APP_USER_AGENT_SUFFIX = "AthlonMobile/1.0";

const INJECTED_BEFORE = "window.__ATHLON_APP__=true;true;";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function isAllowedUrl(url: string): boolean {
  if (url.startsWith(APP_URL)) return true;
  if (__DEV__ && (url.startsWith("http://localhost:") || url.startsWith("http://127.0.0.1:"))) {
    return true;
  }
  return false;
}

export default function App() {
  const webViewRef = useRef<WebViewHandle | null>(null);
  const canGoBackRef = useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, []);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    canGoBackRef.current = nav.canGoBack;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F3" />
      <NativeWebView
        ref={webViewRef as never}
        source={{ uri: APP_URL }}
        applicationNameForUserAgent={APP_USER_AGENT_SUFFIX}
        injectedJavaScriptBeforeContentLoaded={INJECTED_BEFORE}
        onNavigationStateChange={onNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={(request: { url: string }) => isAllowedUrl(request.url)}
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        startInLoadingState
        originWhitelist={["https://*", "http://localhost:*", "http://127.0.0.1:*"]}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <Image
            source={require("./assets/splash-icon.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Carregando ATHLON"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF8F3",
  },
  webview: {
    flex: 1,
    backgroundColor: "#FDF8F3",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDF8F3",
  },
  logo: {
    width: 176,
    height: 176,
  },
});
