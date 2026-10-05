import { useEffect, useState } from 'react'

const LOCAL_STORAGE_NAME = 'theme'

export type ThemeMode = 'light' | 'dark' | 'auto'

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'auto'

/** Resolve a mode into the concrete theme that should be rendered. */
const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode !== 'auto') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** Apply a mode to <html>. Kept in sync with THEME_INIT_SCRIPT. */
const applyTheme = (mode: ThemeMode) => {
  const resolved = resolveTheme(mode)
  const rootElm = document.documentElement

  rootElm.classList.remove('light', 'dark')
  rootElm.classList.add(resolved)

  if (mode === 'auto') {
    rootElm.removeAttribute('data-theme')
  } else {
    rootElm.setAttribute('data-theme', mode)
  }

  rootElm.style.colorScheme = resolved
}

const readTheme = (): ThemeMode => {
  const stored = localStorage.getItem(LOCAL_STORAGE_NAME)
  return isThemeMode(stored) ? stored : 'auto'
}

export const useDarkMode = () => {
  const [theme, setTheme] = useState<ThemeMode>(readTheme)

  // Apply to the DOM whenever the state changes. This covers the initial
  // mount, a local `setTheme`, and a cross-tab update from the listener.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Persist local changes. The `storage` event is deliberately NOT listened
  // to here, since it never fires in the document that made the change.
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_NAME, theme)
  }, [theme])

  // The `storage` event only fires in *other* documents/tabs of the same
  // origin, never in the one that wrote the value.
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      // `key === null` means the whole storage area was cleared.
      if (ev.key !== null && ev.key !== LOCAL_STORAGE_NAME) return
      setTheme(isThemeMode(ev.newValue) ? ev.newValue : 'auto')
    }

    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return [theme, setTheme] as const
}
