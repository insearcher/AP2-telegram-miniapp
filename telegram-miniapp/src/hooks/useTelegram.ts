/**
 * Hook for Telegram Mini App SDK integration
 *
 * Initializes Telegram WebApp SDK and provides access to:
 * - User information
 * - Theme parameters
 * - Viewport controls
 * - Ready state
 */

import { useEffect, useState } from 'react';
import { initData, viewport, themeParams } from '@telegram-apps/sdk';

interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Try to restore init data from Telegram WebApp
      initData.restore();
      const telegramUser = initData.user();

      if (telegramUser) {
        setUser({
          id: telegramUser.id,
          firstName: telegramUser.firstName,
          lastName: telegramUser.lastName,
          username: telegramUser.username,
          languageCode: telegramUser.languageCode,
        });

        // Expand viewport to full screen
        viewport.expand();

        // Bind CSS variables for theme
        viewport.bindCssVars();
      } else {
        // Running in browser (not in Telegram)
        // This is OK for development
        console.warn('Telegram SDK not initialized. Running in browser mode.');
      }
    } catch (err) {
      // SDK initialization failed - this is expected in browser mode
      console.warn('Telegram SDK not available. Running in browser mode:', err);
      // Don't set error state - this is normal for development
    } finally {
      setIsReady(true);
    }
  }, []);

  return {
    user,
    themeParams,
    isReady,
    error,
    isTelegramEnv: user !== null,
  };
}
