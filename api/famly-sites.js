const FAMLY_API = 'https://famlyapi.famly.co/v1/graphql'

const QUERY = `
  query ListSites {
    me {
      profile {
        sites {
          siteId
          title
        }
      }
    }
  }
`

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.FAMLY_ACCESS_TOKEN
  if (!token) {
    return res.status(503).json({ error: 'FAMLY_ACCESS_TOKEN not configured' })
  }

  try {
    const response = await fetch(FAMLY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Famly-Accesstoken': token,
      },
      body: JSON.stringify({ query: QUERY }),
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `Famly API error: ${response.status}` })
    }

    const json = await response.json()
    if (json.errors) {
      return res.status(400).json({ error: json.errors[0]?.message ?? 'GraphQL error' })
    }

    const raw = json.data?.me?.profile?.sites ?? []
    const sites = raw.map(s => ({ id: s.siteId, name: s.title }))
    return res.status(200).json(sites)
  } catch (err) {
    console.error('[famly-sites] error:', err)
    return res.status(502).json({ error: 'Failed to reach Famly API' })
  }
}
