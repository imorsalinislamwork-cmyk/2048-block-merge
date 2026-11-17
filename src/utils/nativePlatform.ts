import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initNativeAndroidUI(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0e0520' });
  } catch {
    // Ignore on platforms where StatusBar is unsupported
  }

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
