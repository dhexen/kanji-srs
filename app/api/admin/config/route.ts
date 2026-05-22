import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'
import { DEFAULT_SRS_INTERVALS } from '@/lib/srs'

export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const { data, error } = await service
      .from('app_config')
      .select('key, value, updated_at')

    if (error) throw new AdminApiError(error.message, 500)
    const config: Record<string, unknown> = {}
    for (const row of data || []) {
      config[row.key] = row.value
    }
    return NextResponse.json({ config })
  } catch (e) {
    return adminJsonError(e)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const body = await request.json()

    // Validate srs_intervals
    if (body.srs_intervals !== undefined) {
      const intervals = body.srs_intervals
      if (!Array.isArray(intervals) || intervals.length !== 8) {
        throw new AdminApiError('srs_intervals debe ser un array de 8 números', 400)
      }
      if (intervals[0] !== 0) {
        throw new AdminApiError('El nivel 0 debe tener intervalo 0', 400)
      }
      for (let i = 0; i < intervals.length; i++) {
        if (typeof intervals[i] !== 'number' || intervals[i] < 0) {
          throw new AdminApiError(`Intervalo inválido en posición ${i}`, 400)
        }
      }
      // Intervals should be non-decreasing
      for (let i = 1; i < intervals.length; i++) {
        if (intervals[i] < intervals[i - 1]) {
          throw new AdminApiError(`El intervalo del nivel ${i} no puede ser menor que el del nivel ${i - 1}`, 400)
        }
      }

      const { error } = await service
        .from('app_config')
        .upsert({
          key: 'srs_intervals',
          value: intervals,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' })
      if (error) throw new AdminApiError(error.message, 500)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
