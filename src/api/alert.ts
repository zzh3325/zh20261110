import { http } from '@/utils/request'
import { normalizeAlert } from '@/api/alerts'

export const alertApi = {
  list: async () => (await http.get<Record<string, unknown>[]>('/get/alert')).map(normalizeAlert),
  search: async (query: Record<string, unknown>) =>
    (await http.get<Record<string, unknown>[]>('/get/alert/search', query)).map(normalizeAlert),
  detail: async (id: string | number) => normalizeAlert(await http.get<Record<string, unknown>>(`/get/alert/${id}`)),
  thresholds: () => http.get('/get/alert/thresholds'),
  handle: (id: string | number) => http.post(`/admin/alerts/${id}/handle`, {})
}
