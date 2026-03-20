import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

function parseMetadata(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return {} }
}

export function useLessonPlanStats() {
  return useQuery({
    queryKey: ['lesson-plan-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('id, grade_level, subject, lesson_type, metadata, created_at')
      if (error) throw error
      return data.map(r => ({ ...r, metadata: parseMetadata(r.metadata) }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserStats() {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, school_branch, role, is_approved, created_at, query_limit')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useContentStats() {
  return useQuery({
    queryKey: ['content-stats'],
    queryFn: async () => {
      const [textbooks, sowEntries, exams] = await Promise.all([
        supabase.from('textbooks').select('id, grade_level, subject, book_tag'),
        supabase.from('sow_entries').select('id, grade_level, subject, term'),
        supabase.from('generated_exams').select('id, grade, subject, status, metadata, created_at'),
      ])
      if (textbooks.error) throw textbooks.error
      if (sowEntries.error) throw sowEntries.error
      if (exams.error) throw exams.error
      return {
        textbooks: textbooks.data,
        sowEntries: sowEntries.data,
        exams: exams.data.map(r => ({ ...r, metadata: parseMetadata(r.metadata) })),
      }
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useExplorerData() {
  return useQuery({
    queryKey: ['explorer-data'],
    queryFn: async () => {
      const [plansRes, examsRes, usersRes, textbooksRes] = await Promise.all([
        supabase.from('lesson_plans').select(
          'id, grade_level, subject, lesson_type, topic, page_start, page_end, textbook_id, created_by_id, metadata, created_at'
        ),
        supabase.from('generated_exams').select(
          'id, exam_id, grade, subject, status, total_marks, total_questions, objective_questions_count, subjective_questions_count, metadata, created_by, created_at'
        ),
        supabase.from('users').select('id, first_name, last_name, email, school_branch, role, grade, subject'),
        supabase.from('textbooks').select('id, grade_level, subject, book_type, book_tag, title'),
      ])
      if (plansRes.error) throw plansRes.error
      if (examsRes.error) throw examsRes.error
      if (usersRes.error) throw usersRes.error
      if (textbooksRes.error) throw textbooksRes.error

      const userMap = Object.fromEntries(usersRes.data.map(u => [u.id, u]))
      const textbookMap = Object.fromEntries(textbooksRes.data.map(t => [t.id, t]))

      const plans = plansRes.data.map(p => {
        const meta = parseMetadata(p.metadata)
        return {
          ...p,
          metadata: meta,
          _service: 'lesson_plan',
          _grade: p.grade_level,
          _cost: meta.cost ?? 0,
          user: userMap[p.created_by_id] ?? null,
          textbook: textbookMap[p.textbook_id] ?? null,
        }
      })

      const exams = examsRes.data.map(e => {
        const meta = parseMetadata(e.metadata)
        return {
          ...e,
          metadata: meta,
          _service: 'exam',
          _grade: e.grade ? `Grade ${e.grade}` : null,
          _cost: meta.cost?.total_cost ?? 0,
          user: userMap[e.created_by] ?? null,
        }
      })

      return { plans, exams, users: usersRes.data, textbooks: textbooksRes.data }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useExamStats() {
  return useQuery({
    queryKey: ['exam-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_exams')
        .select('id, grade, subject, status, created_at')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useExamCostStats() {
  return useQuery({
    queryKey: ['exam-cost-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_exams')
        .select('id, grade, subject, metadata, created_at')
      if (error) throw error
      return data.map(r => ({ ...r, metadata: parseMetadata(r.metadata) }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useActivePlansPerDay(days = 30) {
  return useQuery({
    queryKey: ['plans-per-day', days],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('created_at, metadata')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(r => ({ ...r, metadata: parseMetadata(r.metadata) }))
    },
    staleTime: 5 * 60 * 1000,
  })
}
