import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/snapshot', async (req, res, next) => {
  try {
    const [warehouses, features, warehouseFeatures, warehouseSettings] = await Promise.all([
      prisma.warehouse.findMany({ orderBy: { code: 'asc' } }),
      prisma.feature.findMany({ where: { enabled: true } }),
      prisma.warehouseFeature.findMany(),
      prisma.warehouseSetting.findMany({ orderBy: { key: 'asc' } }),
    ])

    const featuresByWarehouse = new Map<string, typeof warehouseFeatures>()
    const settingsByWarehouse = new Map<string, typeof warehouseSettings>()

    for (const wf of warehouseFeatures) {
      if (!featuresByWarehouse.has(wf.warehouseId)) featuresByWarehouse.set(wf.warehouseId, [])
      featuresByWarehouse.get(wf.warehouseId)!.push(wf)
    }

    for (const ws of warehouseSettings) {
      if (!settingsByWarehouse.has(ws.warehouseId)) settingsByWarehouse.set(ws.warehouseId, [])
      settingsByWarehouse.get(ws.warehouseId)!.push(ws)
    }

    const snapshot = warehouses.map(warehouse => {
      const overrides = featuresByWarehouse.get(warehouse.id) ?? []
      const overrideMap = new Map(overrides.map(o => [o.featureId, o]))

      const enabledFeatures = features
        .filter(f => overrideMap.get(f.id)?.enabled !== false)
        .map(f => ({
          route: f.route,
          name: f.name,
        }))

      const settings = (settingsByWarehouse.get(warehouse.id) ?? []).map(s => ({
        key: s.key,
        value: s.value,
      }))

      return {
        code: warehouse.code,
        features: enabledFeatures,
        settings,
      }
    })

    res.json(snapshot)
  } catch (err) {
    next(err)
  }
})

export default router
