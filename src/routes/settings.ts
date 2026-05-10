import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { key, defaultValue, description } = req.body as {
      key?: string
      defaultValue?: string
      description?: string
    }
    if (!key) return next(createError('key is required', 400))

    const last = await prisma.setting.findFirst({ orderBy: { sortOrder: 'desc' } })
    const setting = await prisma.setting.create({
      data: {
        key: key.trim(),
        defaultValue: defaultValue?.trim() ?? '',
        description: description?.trim() ?? '',
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    })

    // Copy to all existing warehouses
    const warehouses = await prisma.warehouse.findMany({ select: { id: true } })
    if (warehouses.length) {
      await prisma.warehouseSetting.createMany({
        data: warehouses.map(w => ({
          warehouseId: w.id,
          key: setting.key,
          value: setting.defaultValue,
        })),
        skipDuplicates: true,
      })
    }

    res.status(201).json(setting)
  } catch (err: any) {
    if (err.code === 'P2002') return next(createError('Setting key already exists', 409))
    next(err)
  }
})

router.put('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: string[] }
    if (!Array.isArray(ids)) return next(createError('ids array is required', 400))

    await prisma.$transaction(
      ids.map((id, index) => prisma.setting.update({ where: { id }, data: { sortOrder: index } }))
    )
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { key, defaultValue, description } = req.body as {
      key?: string
      defaultValue?: string
      description?: string
    }

    const data: Record<string, unknown> = {}
    if (key !== undefined) data.key = key.trim()
    if (defaultValue !== undefined) data.defaultValue = defaultValue.trim()
    if (description !== undefined) data.description = description.trim()

    if (!Object.keys(data).length) return next(createError('Nothing to update', 400))

    const setting = await prisma.setting.update({ where: { id: req.params.id }, data })
    res.json(setting)
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Setting not found', 404))
    if (err.code === 'P2002') return next(createError('Setting key already exists', 409))
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.setting.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'P2025') return next(createError('Setting not found', 404))
    next(err)
  }
})

export default router
