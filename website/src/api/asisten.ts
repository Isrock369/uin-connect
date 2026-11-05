import { apiFetch } from './client'
export type Topic = 'poin' | 'sampah' | 'mingguan' | 'mabna'
export interface AssistantAnswer {
  topic: Topic; mode: 'data' | 'ai'; aiExplanation?: string; aiStatus?: string; generatedAt: string; title: string; period: string
  mabna?: { id: number; nama: string; total: string; categories: { label: string; value: string }[] }[]
  summary: string; note: string
  metrics: { label: string; value: string }[]
  details: { label: string; value: string }[]
}
export const getAssistantAnswer = (topic: Topic) => apiFetch<AssistantAnswer>(`/asisten/jawaban?${new URLSearchParams({ topic })}`)

export const askAssistant = (question: string) => apiFetch<AssistantAnswer>('/asisten/pertanyaan', { method: 'POST', body: { question } })

