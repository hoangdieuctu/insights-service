import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

const router = Router({ mergeParams: true })

router.get('/', async (req, res, next) => {
  try {
    const { id: warehouseId } = req.params as { id: string }
    const overrides = await prisma.warehouseGroup.findMany({ where: { warehouseId } })
    res.json(overrides)
  } catch (err) {
    next(err)
  }
})

router.put('/:groupId', async (req, res, next) => {
  try {
    const { id: warehouseId, groupId } = req.params as { id: string; groupId: string }
    const { enabled } = req.body as { enabled?: boolean }
    if (enabled === undefined) return next(createError('enabled is required', 400))

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) return next(createError('Warehouse not found', 404))

    const override = await prisma.warehouseGroup.upsert({
      where: { warehouseId_groupId: { warehouseId, groupId } },
      update: { enabled },
      create: { warehouseId, groupId, enabled },
    })
    res.json(override)
  } catch (err) {
    next(err)
  }
})

export default router
