"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type PromptMode = "browser" | "ios" | null;

export default function InstallPwaPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [promptMode, setPromptMode] = useState<PromptMode>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    const isIOS =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) return;

    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed === "true") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      setInstallPrompt(event as BeforeInstallPromptEvent);
      setPromptMode("browser");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS fallback: show manual instructions after a short delay.
    if (isIOS) {
      const timer = window.setTimeout(() => {
        setPromptMode("ios");
      }, 1500);

      return () => {
        window.clearTimeout(timer);
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );
      };
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setPromptMode(null);
    }

    setInstallPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem("pwa-install-dismissed", "true");
    setPromptMode(null);
  }

  if (!promptMode) return null;

  const isIOS = promptMode === "ios";

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-950 p-4 text-white shadow-2xl">
      <div className="flex items-start gap-3">
        <img
          src="/icon-192x192.png"
          alt=""
          className="h-12 w-12 rounded-xl"
        />

        <div className="flex-1">
          <h2 className="text-base font-semibold">Install the app</h2>

          {isIOS ? (
            <p className="mt-1 text-sm text-slate-300">
              On iPhone, tap the Share button in Safari, then choose{" "}
              <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-300">
              Install this app on your phone for quicker access.
            </p>
          )}

          <div className="mt-4 flex gap-2">
            {promptMode === "browser" && installPrompt ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Install app
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
