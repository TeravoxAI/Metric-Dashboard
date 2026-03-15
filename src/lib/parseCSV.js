const EXPECTED_HEADERS = new Set([
  'generation_id', 'created_at', 'cost_total', 'cost_web_search', 'cost_cache',
  'cost_file_processing', 'byok_usage_inference', 'tokens_prompt', 'tokens_completion',
  'tokens_reasoning', 'tokens_cached', 'model_permaslug', 'provider_name', 'variant',
  'cancelled', 'streamed', 'user', 'finish_reason_raw', 'finish_reason_normalized',
  'generation_time_ms', 'time_to_first_token_ms', 'app_name', 'api_key_name',
])

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Minimal CSV parser — handles quoted fields */
export function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  // Reject any dangerous or unexpected headers
  for (const h of headers) {
    if (DANGEROUS_KEYS.has(h)) throw new Error(`Dangerous CSV header: ${h}`)
    if (!EXPECTED_HEADERS.has(h)) console.warn(`Unexpected CSV header: ${h}`)
  }

  return lines.slice(1).map(line => {
    const values = []
    let cur = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = '' }
      else cur += ch
    }
    values.push(cur.trim())

    // Use Object.create(null) to avoid prototype chain entirely
    const row = Object.create(null)
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}
