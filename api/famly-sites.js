const FAMLY_API = 'https://famlyapi.famly.co/v1/graphql'

// Try multiple query patterns - Famly's schema varies
const QUERIES = [
  { query: `{ sites { list { result { siteId title } } } }`, extract: d => d?.sites?.list?.result },
  { query: `{ sites { list { sites { siteId title } } } }`, extract: d => d?.sites?.list?.sites },
  { query: `{ me { profile { sites { siteId title } } } }`, extract: d => d?.me?.profile?.sites },
]

async function tryQuery(token, queryDef) {
  const response = await fetch(FAMLY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Famly-Accesstoken': token,
    },
    body: JSON.stringify({ query: queryDef.query }),
  })

  if (!response.ok) return null

  const json = await response.json()
  if (json.errors) return null

  const sites = queryDef.extract(json.data)
  if (Array.isArray(sites) && sites.length > 0) {
    return sites.map(s => ({ id: s.siteId, name: s.title }))
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.FAMLY_ACCESS_TOKEN
  if (!token) {
    return res.status(503).json({ error: 'FAMLY_ACCESS_TOKEN not configured' })
  }

  try {
    for (const queryDef of QUERIES) {
      const sites = await tryQuery(token, queryDef)
      if (sites) {
        return res.status(200).json(sites)
      }
    }
    return res.status(400).json({ error: 'Could not fetch sites from Famly - check token permissions' })
  } catch (err) {
    console.error('[famly-sites] error:', err)
    return res.status(502).json({ error: 'Failed to reach Famly API' })
  }
}
