const mongoose = require('mongoose')
const dns = require('dns').promises
const dnsSync = require('dns')

// Node.js on this machine resolves DNS through 127.0.0.1 (localhost) which
// has no DNS server running → ECONNREFUSED on every lookup.
// Override to use Google's and Cloudflare's public DNS servers.
dnsSync.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

let connectionPromise = null

/**
 * Resolves the mongodb+srv:// URI into a standard mongodb:// URI with all
 * replica-set hosts listed explicitly. This bypasses Node.js's problematic
 * dns.resolveSrv() call on Windows which can fail with ECONNREFUSED when
 * the system DNS returns IPv6 NAT64 addresses for the SRV query.
 */
async function resolveSrvUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri

  try {
    // Extract parts: mongodb+srv://user:pass@host/db?opts
    const withoutScheme = uri.slice('mongodb+srv://'.length)
    const atIdx = withoutScheme.lastIndexOf('@')
    const credentials = withoutScheme.slice(0, atIdx)       // user:pass
    const rest = withoutScheme.slice(atIdx + 1)             // host/db?opts
    const slashIdx = rest.indexOf('/')
    const srvHost = slashIdx === -1 ? rest : rest.slice(0, slashIdx)
    const afterHost = slashIdx === -1 ? '' : rest.slice(slashIdx) // /db?opts

    // Parse /db and ?existing-opts from the original URI
    const qIdx = afterHost.indexOf('?')
    const dbPart = qIdx === -1 ? afterHost : afterHost.slice(0, qIdx)  // /doclib
    const existingOpts = qIdx === -1 ? '' : afterHost.slice(qIdx + 1)  // retryWrites=true&...

    // Collect all opts into a Map so duplicates are automatically deduplicated
    const opts = new Map()
    // Start with options from the original URI
    if (existingOpts) {
      for (const pair of existingOpts.split('&')) {
        const [k, v] = pair.split('=')
        if (k) opts.set(k, v || '')
      }
    }
    // Merge TXT record options (Atlas sets authSource, replicaSet etc.)
    try {
      const txts = await dns.resolveTxt(srvHost)
      for (const pair of txts.flat().join('&').split('&')) {
        const [k, v] = pair.split('=')
        if (k && !opts.has(k)) opts.set(k, v || '') // don't override user opts
      }
    } catch (_) { /* TXT record is optional */ }
    // mongodb+srv always implies TLS
    if (!opts.has('tls') && !opts.has('ssl')) opts.set('tls', 'true')

    // Resolve SRV records
    const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${srvHost}`)
    const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(',')

    const queryString = [...opts.entries()].map(([k, v]) => `${k}=${v}`).join('&')
    const resolvedUri = `mongodb://${credentials}@${hosts}${dbPart}?${queryString}`

    console.log(`🔍 SRV resolved → ${hosts}`)
    return resolvedUri
  } catch (err) {
    console.warn(`⚠️  SRV pre-resolve failed (${err.message}), falling back to original URI`)
    return uri
  }
}


async function connectDB() {
  if (mongoose.connection.readyState === 1) return
  if (connectionPromise) return connectionPromise

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/doclib'

  connectionPromise = (async () => {
    const resolvedUri = await resolveSrvUri(uri)

    await mongoose.connect(resolvedUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      family: 4, // Force IPv4 TCP connections
    })

    console.log('✅ MongoDB connected')
  })()

  try {
    await connectionPromise
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    throw err
  } finally {
    connectionPromise = null
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — attempting to reconnect...')
})

module.exports = { connectDB }
