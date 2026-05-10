import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } })
    res.json(warehouses)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { code, name } = req.body as { code?: string; name?: string }
    if (!code || !name) return next(createError('code and name are required', 400))

    const warehouse = await prisma.warehouse.create({
      data: { code: code.trim(), name: name.trim() },
    })

    const globalSettings = await prisma.setting.findMany()
    if (globalSettings.length) {
      await prisma.warehouseSetting.createMany({
        data: globalSettings.map((s: { key: string; defaultValue: string }) => ({
          warehouseId: warehouse.id,
          key: s.key,
          value: s.defaultValue,
        })),
        skipDuplicates: true,
      })
    }

    res.status(201).json(warehouse)
  } catch (err: any) {
    if (err.code === 'P2002') return next(createError('Warehouse code already exists', 409))
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: req.params.id } })
    if (!warehouse) return next(createError('Warehouse not found', 404))
    res.json(warehouse)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { code, name } = req.body as { code?: string; name?: string }
    const data: { code?: string; name?: string } = {}
    if (code !== undefined) data.code = code.trim()
    if (name !== undefined) data.name = name.trim()

    const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data })
    res.json(warehouse)
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Warehouse not found', 404))
    if (err.code === 'P2002') return next(createError('Warehouse code already exists', 409))
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.warehouse.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Warehouse not found', 404))
    next(err)
  }
})

export default router
