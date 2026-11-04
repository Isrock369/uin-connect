import { apiFetch } from './client'
export type Topic = 'poin' | 'sampah' | 'mingguan'
export interface AssistantOptions {
  asrama: { id: number | string; nama: string }[]
  sampah: { id: number | string; jenis: string; kategori: string }[]
}
export interface AssistantAnswer {
  topic: Topic; mode: 'data' | 'ai'; aiExplanation?: string; aiStatus?: string; generatedAt: string; title: string; period: string
  summary: string; note: string
  metrics: { label: string; value: string }[]
  details: { label: string; value: string }[]
}
export const getAssistantOptions = () => apiFetch<AssistantOptions>('/asisten/pilihan')
export const getAssistantAnswer = (topic: Topic, id: string) => apiFetch<AssistantAnswer>(`/asisten/jawaban?${new URLSearchParams({ topic, ...(topic === 'mingguan' ? {} : { id }) })}`)
