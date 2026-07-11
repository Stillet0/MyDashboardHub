const KEY = 'monhub_gemini_key'

export function getGeminiKey(): string | null {
  return localStorage.getItem(KEY)
}

export function setGeminiKey(key: string) {
  localStorage.setItem(KEY, key.trim())
}

export function clearGeminiKey() {
  localStorage.removeItem(KEY)
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey()
}
