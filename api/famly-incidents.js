const FAMLY_API = 'https://famlyapi.famly.co/v1/graphql'

// NOTE: Field names are inferred from the Famly GraphQL schema.
// If fields come back empty, use https://famlyapi.famly.co/v1/graphiql to inspect
// the exact schema with your access token.
const QUERY = `
  query AccidentReports($siteIds: [ID!]!, $from: Date, $to: Date, $nextToken: String) {
    accidentReports {
      listBySiteIds(siteIds: $siteIds, from: $from, to: $to, nextToken: $nextToken) {
        result {
          reportId
          kind
          happenedAt
          createdAt
          status
          location
          nature
          firstAid
          site { siteId title }
          child {
            id
            name { firstName lastName fullName }
          }
          createdBy { name { fullName } }
          witnesses { name { fullName } }
          approvedBy { name { fullName } }
          approvedAt
          acknowledgedBy { name { fullName } }
          acknowledgedAt
        }
        nextToken
      }
    }
  }
`

async function fetchPage(token, siteId, from, to, cursor) {
  const response = await fetch(FAMLY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Famly-Accesstoken': token,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        siteIds: [siteId],
        from,
        to,
        ...(cursor ? { nextToken: cursor } : {}),
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Famly API HTTP error: ${response.status}`)
  }

  const json = await response.json()
  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL error')
  }

  return json.data?.accidentReports?.listBySiteIds ?? { result: [], nextToken: null }
}

function normalise(r) {
  return {
    id: r.reportId ?? r.id,
    childName: r.child?.name?.fullName ?? 'Unknown',
    kind: r.kind === 'incident' ? 'Incident' : 'Accident',
    happenedAt: r.happenedAt ?? r.createdAt,
    createdBy: r.createdBy?.name?.fullName ?? '',
    location: r.location ?? '',
    status: r.status === 'draft' ? 'Draft' : 'Sent',
    nature: r.nature ?? '',
    firstAid: r.firstAid ?? '',
    witnesses: (r.witnesses ?? []).map(w => w.name?.fullName ?? ''),
    approvedBy: r.approvedBy?.name?.fullName ?? undefined,
    approvedAt: r.approvedAt ?? undefined,
    acknowledgedBy: r.acknowledgedBy?.name?.fullName ?? undefined,
    acknowledgedAt: r.acknowledgedAt ?? undefined,
    siteId: r.site?.siteId ?? '',
    siteName: r.site?.title ?? '',
    childId: r.child?.id ?? null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { siteId, from, to } = req.query

  if (!siteId) {
    return res.status(400).json({ error: 'siteId is required' })
  }

  const token = process.env.FAMLY_ACCESS_TOKEN
  if (!token) {
    return res.status(503).json({ error: 'FAMLY_ACCESS_TOKEN not configured' })
  }

  try {
    const allRecords = []
    let cursor = null

    do {
      const page = await fetchPage(token, siteId, from ?? '', to ?? '', cursor)
      allRecords.push(...(page.result ?? []))
      cursor = page.nextToken ?? null
    } while (cursor)

    return res.status(200).json(allRecords.map(normalise))
  } catch (err) {
    console.error('[famly-incidents] error:', err)
    return res.status(502).json({ error: err.message ?? 'Unknown error' })
  }
}
