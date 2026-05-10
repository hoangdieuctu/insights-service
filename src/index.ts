import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import path from 'path'
import featureGroupsRouter from './routes/featureGroups'
import warehousesRouter from './routes/warehouses'
import featuresRouter from './routes/features'
import warehouseFeaturesRouter from './routes/warehouseFeatures'
import warehouseGroupsRouter from './routes/warehouseGroups'
import warehouseSettingsRouter from './routes/warehouseSettings'
import settingsRouter from './routes/settings'
import { errorHandler } from './middleware/errorHandler'
import { requireAuth } from './middleware/basicAuth'
import { apiKeyAuth } from './middleware/apiKeyAuth'
import internalRouter, { flushCache } from './routes/internal'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(session({
  secret: process.env.SESSION_SECRET ?? 'insights-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8h
}))

// Auth endpoints — no auth required
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  if (username === process.env.AUTH_USER && password === process.env.AUTH_PASSWORD) {
    ;(req.session as any).authenticated = true
    res.json({ ok: true })
  } else {
    res.status(401).json({ error: { message: 'Invalid username or password.' } })
  }
})

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true })
  })
})

// Cache flush — session auth (used by the UI nav button), must be before apiKeyAuth middleware
app.post('/api/internal/cache/flush', requireAuth, (req, res) => {
  flushCache()
  res.json({ ok: true })
})

// Internal API — API key auth only, no session required
app.use('/api/internal', apiKeyAuth, internalRouter)

// Public assets needed before auth (login page dependencies only)
const PUBLIC_ASSETS = ['/login.html', '/style.css', '/app.js', '/favicon.svg']
app.use((req, res, next) => {
  if (PUBLIC_ASSETS.includes(req.path)) {
    return express.static(path.join(__dirname, '..', 'public'))(req, res, next)
  }
  next()
})

// All routes below require auth
app.use(requireAuth)

// Authenticated static files (index.html, features.html, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/api/warehouses', warehousesRouter)
app.use('/api/feature-groups', featureGroupsRouter)
app.use('/api/features', featuresRouter)
app.use('/api/warehouses/:id/features', warehouseFeaturesRouter)
app.use('/api/warehouses/:id/groups', warehouseGroupsRouter)
app.use('/api/warehouses/:id/settings', warehouseSettingsRouter)
app.use('/api/settings', settingsRouter)

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
