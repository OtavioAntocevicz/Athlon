import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { foiDispensadoRecentemente, registrarDispensa } from "./pwa-install-storage";

const IOS_SESSION_DELAY_MS = 30_000;

export function detectEhIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

/** Chrome, Firefox, Edge, Opera e webviews no iOS não suportam instalação PWA como o Safari. */
export function detectEhSafariIOS(): boolean {
  if (!detectEhIOS()) return false;
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) return false;
  if (/FBAN|FBAV|Instagram|Line\/|Twitter/i.test(ua)) return false;
  return /Safari/i.test(ua);
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

  const routeKeyRef = useRef(location.pathname);
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

  useEffect(() => {
    if (!ehIOS || jaInstalado) return;

    timerRef.current = setTimeout(() => setIosPronto(true), IOS_SESSION_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ehIOS, jaInstalado]);

  useEffect(() => {
    if (!ehIOS || jaInstalado || iosPronto) return;
    if (location.pathname !== routeKeyRef.current) {
      setIosPronto(true);
    }
  }, [ehIOS, jaInstalado, iosPronto, location.pathname]);

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
