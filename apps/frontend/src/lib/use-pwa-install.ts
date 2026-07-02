import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { foiDispensadoRecentemente, registrarDispensa } from "./pwa-install-storage";

const IOS_SAFARI_DELAY_MS = 8_000;
const IOS_SESSION_KEY = "athlon:pwa-ios-session-start";

export function detectEhIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ pode reportar como Mac
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** Chrome, Firefox, Edge, Opera e webviews no iOS não suportam instalação PWA como o Safari. */
export function detectEhSafariIOS(): boolean {
  if (!detectEhIOS()) return false;
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) return false;
  if (/FBAN|FBAV|Instagram|Line\/|Twitter/i.test(ua)) return false;
  // Todos os browsers no iOS incluem "Safari" no UA; excluímos os não-Safari acima.
  return true;
}

export function detectEhIOSNaoSafari(): boolean {
  return detectEhIOS() && !detectEhSafariIOS();
}

export function detectJaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
  );
}

function getSessionStartMs(): number {
  try {
    const raw = sessionStorage.getItem(IOS_SESSION_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) return parsed;
    }
    const now = Date.now();
    sessionStorage.setItem(IOS_SESSION_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function usePwaInstall() {
  const location = useLocation();
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [jaInstalado, setJaInstalado] = useState(detectJaInstalado);
  const [ehIOS] = useState(detectEhIOS);
  const [ehSafariIOS] = useState(detectEhSafariIOS);
  const [ehIOSNaoSafari] = useState(detectEhIOSNaoSafari);
  const [podeInstalarAndroid, setPodeInstalarAndroid] = useState(false);
  const [iosPronto, setIosPronto] = useState(false);
  const [iosDispensado, setIosDispensado] = useState(foiDispensadoRecentemente);
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const [safariModalAberto, setSafariModalAberto] = useState(false);

  const rotasVisitadasRef = useRef(new Set([location.pathname]));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setPodeInstalarAndroid(true);
    };

    const onInstalled = () => {
      deferredPromptRef.current = null;
      setPodeInstalarAndroid(false);
      setJaInstalado(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Chrome/outros no iOS: aviso imediato (sem esperar 30s).
  useEffect(() => {
    if (ehIOSNaoSafari && !jaInstalado) {
      setIosPronto(true);
    }
  }, [ehIOSNaoSafari, jaInstalado]);

  // Safari no iOS: após tempo de sessão ou ao trocar de rota.
  useEffect(() => {
    if (!ehSafariIOS || jaInstalado || iosPronto) return;

    const sessionStart = getSessionStartMs();
    const elapsed = Date.now() - sessionStart;
    const remaining = Math.max(0, IOS_SAFARI_DELAY_MS - elapsed);

    timerRef.current = setTimeout(() => setIosPronto(true), remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ehSafariIOS, jaInstalado, iosPronto]);

  useEffect(() => {
    if (!ehSafariIOS || jaInstalado || iosPronto) return;

    rotasVisitadasRef.current.add(location.pathname);
    if (rotasVisitadasRef.current.size >= 2) {
      setIosPronto(true);
    }
  }, [ehSafariIOS, jaInstalado, iosPronto, location.pathname]);

  const instalarAndroid = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === "accepted") {
      deferredPromptRef.current = null;
      setPodeInstalarAndroid(false);
    }
  }, []);

  const abrirTutorialIOS = useCallback(() => {
    setTutorialAberto(true);
  }, []);

  const fecharTutorialIOS = useCallback(() => {
    setTutorialAberto(false);
  }, []);

  const dispensarTutorialIOS = useCallback(() => {
    registrarDispensa();
    setIosDispensado(true);
    setTutorialAberto(false);
    setSafariModalAberto(false);
  }, []);

  const iosPodeMostrarConvite =
    ehIOS && !jaInstalado && iosPronto && !iosDispensado && !foiDispensadoRecentemente();

  const mostrarConviteIOS = iosPodeMostrarConvite && ehSafariIOS;
  const mostrarAvisoAbrirSafari = iosPodeMostrarConvite && ehIOSNaoSafari;

  const mostrarConviteAndroid = podeInstalarAndroid && !jaInstalado && !ehIOS;

  const abrirModalSafari = useCallback(() => {
    setSafariModalAberto(true);
  }, []);

  const fecharModalSafari = useCallback(() => {
    setSafariModalAberto(false);
  }, []);

  return {
    ehIOS,
    ehSafariIOS,
    ehIOSNaoSafari,
    jaInstalado,
    podeInstalarAndroid,
    mostrarConviteIOS,
    mostrarAvisoAbrirSafari,
    mostrarConviteAndroid,
    tutorialAberto,
    safariModalAberto,
    instalarAndroid,
    abrirTutorialIOS,
    fecharTutorialIOS,
    abrirModalSafari,
    fecharModalSafari,
    dispensarTutorialIOS,
  };
}
