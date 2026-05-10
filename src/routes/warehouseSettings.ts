import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

const router = Router({ mergeParams: true })

router.get('/', async (req, res, next) => {
  try {
    const { id: warehouseId } = req.params as { id: string }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) return next(createError('Warehouse not found', 404))

    const settings = await prisma.warehouseSetting.findMany({
      where: { warehouseId },
      orderBy: { key: 'asc' },
    })
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

router.put('/:key', async (req, res, next) => {
  try {
    const { id: warehouseId, key } = req.params as { id: string; key: string }
    const { value } = req.body as { value?: string }

    if (value === undefined) return next(createError('value is required', 400))

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) return next(createError('Warehouse not found', 404))

    const setting = await prisma.warehouseSetting.upsert({
      where: { warehouseId_key: { warehouseId, key } },
      update: { value: String(value) },
      create: { warehouseId, key, value: String(value) },
    })
    res.json(setting)
  } catch (err) {
    next(err)
  }
})

router.delete('/:key', async (req, res, next) => {
  try {
    const { id: warehouseId, key } = req.params as { id: string; key: string }

    await prisma.warehouseSetting.delete({
      where: { warehouseId_key: { warehouseId, key } },
    })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Setting not found', 404))
    next(err)
  }
})

export default router
