"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

function isSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isWebKit = /AppleWebKit/i.test(ua);
  const hasSafari = /Safari/i.test(ua);
  const notChrome = !/CriOS/i.test(ua);
  const notFirefox = !/FxiOS/i.test(ua);
  const notEdge = !/EdgiOS/i.test(ua);
  return isWebKit && hasSafari && notChrome && notFirefox && notEdge;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (window.matchMedia?.("(display-mode: standalone)")?.matches ?? false) || (navigator as any).standalone === true;
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandaloneMode()) return;

    if (isIOS() && isSafari()) {
      setMode("ios");
      const t = window.setTimeout(() => setVisible(true), 5000);
      return () => window.clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setMode("android");
      window.setTimeout(() => setVisible(true), 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setVisible(false);
  };

  if (!visible || !mode) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <img src="/logo.png" alt="MathParenting" className="h-10 w-10 rounded-xl border object-cover" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">Add MathParenting to Home Screen</div>

          {mode === "android" ? (
            <p className="mt-1 text-sm text-gray-600">Install MathParenting so it opens like an app.</p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              On iPhone Safari tap <span className="font-semibold">Share</span> then{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {mode === "android" ? (
              <button onClick={handleInstall} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Install
              </button>
            ) : (
              <button onClick={() => setVisible(false)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Got it
              </button>
            )}

            <button onClick={() => setVisible(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}