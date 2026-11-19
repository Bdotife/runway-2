/// <reference types="vite/client" />

interface SpeechRecognitionResultLike {
  0: { transcript: string }
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<SpeechRecognitionResultLike> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
interface Window {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}
