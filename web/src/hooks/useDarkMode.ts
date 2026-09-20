import { useEffect, useState } from 'react'

const LOCAL_STORAGE_NAME = 'theme'

export const useDarkMode = () => {
  const [theme, setTheme] = useState(
    localStorage.getItem(LOCAL_STORAGE_NAME) ?? 'auto',
  )

  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LOCAL_STORAGE_NAME) {
        setTheme(ev.newValue ?? 'auto')

        const mode =
          ev.newValue === 'light' ||
          ev.newValue === 'dark' ||
          ev.newValue === 'auto'
            ? ev.newValue
            : 'auto'

        const prefersDark = window.matchMedia(
          '(prefers-color-scheme: dark)',
        ).matches
        const resolved =
          mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

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
    }

    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [setTheme])

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_NAME, theme)
  }, [theme])

  return [theme, setTheme] as const
}
