import { useQuery } from '@tanstack/react-query'
import { parseCSV } from '@/lib/parseCSV'

const CSV_FILES = ['/data/jan-feb.csv', '/data/feb-mar.csv']

async function fetchAndMerge() {
  const results = await Promise.all(
    CSV_FILES.map(async (url) => {
      const res = await fetch(url)
      if (!res.ok) return []
      const text = await res.text()
      try { return parseCSV(text) } catch { return [] }
    })
  )
  const rows = results.flat()

  return rows.map(r => ({
    generation_id: r.generation_id,
    created_at: r.created_at,
    cost: parseFloat(r.cost_total) || 0,
    tokens_prompt: parseInt(r.tokens_prompt) || 0,
    tokens_completion: parseInt(r.tokens_completion) || 0,
    tokens_reasoning: parseInt(r.tokens_reasoning) || 0,
    tokens_cached: parseInt(r.tokens_cached) || 0,
    model: r.model_permaslug,
    provider: r.provider_name,
    app_name: r.app_name || 'Unknown',
    api_key_name: r.api_key_name,
    service: r.api_key_name === 'Exam Gen Key' ? 'Exam Generation' : 'Lesson Plan',
    generation_time_ms: parseInt(r.generation_time_ms) || 0,
    cancelled: r.cancelled === 'true',
    finish_reason: r.finish_reason_normalized,
  }))
}

export function useOpenRouterLogs() {
  return useQuery({
    queryKey: ['openrouter-logs'],
    queryFn: fetchAndMerge,
    staleTime: Infinity,
  })
}
