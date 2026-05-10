import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const features = await prisma.feature.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { group: true },
    })
    res.json(features)
  } catch (err) {
    next(err)
  }
})

// Returns a map of featureId -> warehouse codes (warehouses where feature is effectively enabled)
router.get('/warehouse-map', async (req, res, next) => {
  try {
    const [allWarehouses, allFeatures, disabledFeatureOverrides, disabledGroupOverrides] = await Promise.all([
      prisma.warehouse.findMany({ select: { id: true, code: true } }),
      prisma.feature.findMany({
        where: {
          enabled: true,
          OR: [
            { groupId: null },
            { group: { enabled: true } },
          ],
        },
        select: { id: true, groupId: true },
      }),
      prisma.warehouseFeature.findMany({
        where: { enabled: false },
        select: { featureId: true, warehouseId: true },
      }),
      prisma.warehouseGroup.findMany({
        where: { enabled: false },
        select: { groupId: true, warehouseId: true },
      }),
    ])

    const disabledFeatureSet = new Set(disabledFeatureOverrides.map(o => `${o.featureId}:${o.warehouseId}`))
    const disabledGroupSet   = new Set(disabledGroupOverrides.map(o => `${o.groupId}:${o.warehouseId}`))

    const map: Record<string, string[]> = {}
    for (const f of allFeatures) {
      map[f.id] = allWarehouses
        .filter(w =>
          !disabledFeatureSet.has(`${f.id}:${w.id}`) &&
          !(f.groupId && disabledGroupSet.has(`${f.groupId}:${w.id}`))
        )
        .map(w => w.code)
        .sort()
    }
    res.json(map)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { name, route, enabled, groupId } = req.body as {
      name?: string
      route?: string
      enabled?: boolean
      groupId?: string | null
    }

    if (!name) return next(createError('name is required', 400))
    if (!route) return next(createError('route is required', 400))

    const last = await prisma.feature.findFirst({
      where: { groupId: groupId ?? null },
      orderBy: { sortOrder: 'desc' },
    })
    const feature = await prisma.feature.create({
      data: {
        name: name.trim(),
        route: route.trim(),
        enabled: enabled ?? true,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        groupId: groupId ?? null,
      },
      include: { group: true },
    })
    res.status(201).json(feature)
  } catch (err) {
    next(err)
  }
})

router.get('/:id/warehouses', async (req, res, next) => {
  try {
    const grouped = await prisma.warehouseFeature.groupBy({
      by: ['warehouseId'],
      where: { featureId: req.params.id, enabled: true },
    })
    const warehouseIds = grouped.map(r => r.warehouseId)
    if (!warehouseIds.length) return res.json([])

    const warehouses = await prisma.warehouse.findMany({
      where: { id: { in: warehouseIds } },
      orderBy: { name: 'asc' },
    })
    res.json(warehouses)
  } catch (err) {
    next(err)
  }
})

// PUT /api/features/reorder — reorder features within their group
router.put('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: string[] }
    if (!Array.isArray(ids)) return next(createError('ids array is required', 400))

    await prisma.$transaction(
      ids.map((id, index) => prisma.feature.update({ where: { id }, data: { sortOrder: index } }))
    )
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { name, route, enabled, groupId } = req.body as {
      name?: string
      route?: string
      enabled?: boolean
      groupId?: string | null
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (route !== undefined) data.route = route.trim()
    if (enabled !== undefined) data.enabled = enabled
    if (groupId !== undefined) data.groupId = groupId ?? null

    const feature = await prisma.feature.update({
      where: { id: req.params.id },
      data,
      include: { group: true },
    })
    res.json(feature)
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Feature not found', 404))
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.feature.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Feature not found', 404))
    next(err)
  }
})

export default router
