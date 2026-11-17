import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

export async function initNativeAndroidUI(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SplashScreen.hide();
  } catch {
    // Ignore if already hidden
  }
}

export function registerAndroidBackButton(handler: () => boolean): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let removed = false;
  const listenerPromise = CapApp.addListener('backButton', () => {
    const handled = handler();
    if (!handled) {
      CapApp.exitApp();
    }
  });

  return () => {
    if (removed) return;
    removed = true;
    listenerPromise
      .then((handle) => handle.remove())
      .catch(() => {});
  };
}
