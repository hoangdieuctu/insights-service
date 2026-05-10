import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const groups = await prisma.featureGroup.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json(groups)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { name, route, enabled } = req.body as { name?: string; route?: string; enabled?: boolean }
    if (!name) return next(createError('name is required', 400))
    if (!route) return next(createError('route is required', 400))

    const last = await prisma.featureGroup.findFirst({ orderBy: { sortOrder: 'desc' } })
    const group = await prisma.featureGroup.create({
      data: { name: name.trim(), route: route.trim(), enabled: enabled ?? true, sortOrder: (last?.sortOrder ?? -1) + 1 },
    })
    res.status(201).json(group)
  } catch (err: any) {
    if (err.code === 'P2002') return next(createError('Group route already exists', 409))
    next(err)
  }
})

router.get('/:id/warehouses', async (req, res, next) => {
  try {
    const features = await prisma.feature.findMany({
      where: { groupId: req.params.id, enabled: true },
      select: { id: true },
    })
    const featureIds = features.map((f: { id: string }) => f.id)
    if (!featureIds.length) return res.json([])

    const grouped = await prisma.warehouseFeature.groupBy({
      by: ['warehouseId'],
      where: { featureId: { in: featureIds }, enabled: true },
    })
    const warehouseIds = grouped.map((r: { warehouseId: string }) => r.warehouseId)
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

router.put('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: string[] }
    if (!Array.isArray(ids)) return next(createError('ids array is required', 400))

    await prisma.$transaction(
      ids.map((id, index) => prisma.featureGroup.update({ where: { id }, data: { sortOrder: index } }))
    )
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { name, route, enabled } = req.body as { name?: string; route?: string; enabled?: boolean }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (route !== undefined) data.route = route.trim()
    if (enabled !== undefined) data.enabled = enabled

    if (!Object.keys(data).length) return next(createError('Nothing to update', 400))

    const group = await prisma.featureGroup.update({ where: { id: req.params.id }, data })
    res.json(group)
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Group not found', 404))
    if (err.code === 'P2002') return next(createError('Group route already exists', 409))
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.feature.deleteMany({ where: { groupId: req.params.id } }),
      prisma.featureGroup.delete({ where: { id: req.params.id } }),
    ])
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Group not found', 404))
    next(err)
  }
})

export default router
