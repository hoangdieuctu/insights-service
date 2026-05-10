import { Router } from 'express'
import { prisma } from '../lib/prisma'

type WF = { warehouseId: string; featureId: string; enabled: boolean; value: string | null }
type WS = { warehouseId: string; key: string; value: string }

const router = Router()

let cache: unknown[] | null = null

async function buildSnapshot() {
  const [warehouses, features, warehouseFeatures, warehouseSettings] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { code: 'asc' } }),
    prisma.feature.findMany({ where: { enabled: true } }),
    prisma.warehouseFeature.findMany(),
    prisma.warehouseSetting.findMany({ orderBy: { key: 'asc' } }),
  ])

  const featuresByWarehouse = new Map<string, WF[]>()
  const settingsByWarehouse = new Map<string, WS[]>()

  for (const wf of warehouseFeatures) {
    if (!featuresByWarehouse.has(wf.warehouseId)) featuresByWarehouse.set(wf.warehouseId, [])
    featuresByWarehouse.get(wf.warehouseId)!.push(wf)
  }

  for (const ws of warehouseSettings) {
    if (!settingsByWarehouse.has(ws.warehouseId)) settingsByWarehouse.set(ws.warehouseId, [])
    settingsByWarehouse.get(ws.warehouseId)!.push(ws)
  }

  return warehouses.map((warehouse) => {
    const overrides = featuresByWarehouse.get(warehouse.id) ?? []
    const overrideMap = new Map(overrides.map((o: WF) => [o.featureId, o]))

    const enabledFeatures = features
      .filter((f) => overrideMap.get(f.id)?.enabled !== false)
      .map((f) => ({ route: f.route, name: f.name }))

    const settings = (settingsByWarehouse.get(warehouse.id) ?? []).map((s: WS) => ({
      key: s.key,
      value: s.value,
    }))

    return { code: warehouse.code, features: enabledFeatures, settings }
  })
}

export function flushCache() {
  cache = null
}

router.get('/snapshot', async (req, res, next) => {
  try {
    if (!cache) cache = await buildSnapshot()
    res.json(cache)
  } catch (err) {
    next(err)
  }
})

router.post('/cache/flush', (req, res) => {
  cache = null
  res.json({ ok: true })
})

export default router
