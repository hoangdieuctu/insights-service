import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

type WF = { featureId: string; enabled: boolean; value: string | null }

const router = Router({ mergeParams: true })

router.get('/', async (req, res, next) => {
  try {
    const { id: warehouseId } = req.params as { id: string }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) return next(createError('Warehouse not found', 404))

    const [features, overrides] = await Promise.all([
      // only return globally enabled features
      prisma.feature.findMany({ where: { enabled: true }, orderBy: { route: 'asc' } }),
      prisma.warehouseFeature.findMany({ where: { warehouseId } }),
    ])

    const overrideMap = new Map(overrides.map((o: WF) => [o.featureId, o]))

    const result = features.map((feature) => {
      const override = overrideMap.get(feature.id) ?? null
      return {
        ...feature,
        override,
        resolvedEnabled: (override as WF | null)?.enabled ?? true,
        resolvedValue: (override as WF | null)?.value ?? null,
      }
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.put('/group/:groupId', async (req, res, next) => {
  try {
    const { id: warehouseId, groupId } = req.params as { id: string; groupId: string }
    const { enabled } = req.body as { enabled?: boolean }
    if (enabled === undefined) return next(createError('enabled is required', 400))

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) return next(createError('Warehouse not found', 404))

    const groupFeatures = await prisma.feature.findMany({
      where: { groupId, enabled: true },
    })

    await prisma.$transaction(
      groupFeatures.map((f: { id: string }) =>
        prisma.warehouseFeature.upsert({
          where: { warehouseId_featureId: { warehouseId, featureId: f.id } },
          update: { enabled },
          create: { warehouseId, featureId: f.id, enabled },
        })
      )
    )

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

router.put('/:featureId', async (req, res, next) => {
  try {
    const { id: warehouseId, featureId } = req.params as { id: string; featureId: string }
    const { enabled, value } = req.body as { enabled?: boolean; value?: string | null }

    const [warehouse, feature] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: warehouseId } }),
      prisma.feature.findUnique({ where: { id: featureId } }),
    ])
    if (!warehouse) return next(createError('Warehouse not found', 404))
    if (!feature) return next(createError('Feature not found', 404))
    if (!feature.enabled) return next(createError('Feature is globally disabled', 400))

    const override = await prisma.warehouseFeature.upsert({
      where: { warehouseId_featureId: { warehouseId, featureId } },
      update: {
        ...(enabled !== undefined && { enabled }),
        ...(value !== undefined && { value }),
      },
      create: {
        warehouseId,
        featureId,
        enabled: enabled ?? true,
        value: value ?? null,
      },
    })
    res.json(override)
  } catch (err) {
    next(err)
  }
})

export default router
