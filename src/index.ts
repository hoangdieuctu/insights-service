import 'dotenv/config'
import express from 'express'
import path from 'path'
import featureGroupsRouter from './routes/featureGroups'
import warehousesRouter from './routes/warehouses'
import featuresRouter from './routes/features'
import warehouseFeaturesRouter from './routes/warehouseFeatures'
import warehouseGroupsRouter from './routes/warehouseGroups'
import warehouseSettingsRouter from './routes/warehouseSettings'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/api/warehouses', warehousesRouter)
app.use('/api/feature-groups', featureGroupsRouter)
app.use('/api/features', featuresRouter)
app.use('/api/warehouses/:id/features', warehouseFeaturesRouter)
app.use('/api/warehouses/:id/groups', warehouseGroupsRouter)
app.use('/api/warehouses/:id/settings', warehouseSettingsRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ error: { message: 'API route not found' } })
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`insights-service running on http://localhost:${PORT}`)
})

export default app
