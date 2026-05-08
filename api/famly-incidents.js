const FAMLY_API = 'https://famlyapi.famly.co/v1/graphql'

const REPORTS_QUERY = `
  query AccidentReports($siteIds: [SiteId!]!, $dateRange: ClosedLocalDateRange, $cursor: AccidentReportCursor, $pageSize: Int) {
    accidentReports {
      listBySiteIds(siteIds: $siteIds, dateRange: $dateRange, nextToken: $cursor, pageSize: $pageSize) {
        result {
          reportId kind date time createdAt status location description note firstAid
          parentsNotified lado ofsted riddor onArrival
          site { siteId title }
          child { id name { fullName } }
          createdBy { name { fullName } }
          witness { name { fullName } }
          staffPresent { name { fullName } }
          acknowledgedBy { name { fullName } }
          acknowledgedAt sentAt
        }
        next
      }
    }
  }
`

function normalise(r) {
  return {
    id: r.reportId ?? r.id,
    childName: r.child?.name?.fullName ?? 'Unknown',
    childId: r.child?.id ?? null,
    kind: r.kind === 'incident' ? 'Incident' : 'Accident',
    happenedAt: r.date ?? r.createdAt,
    time: r.time ?? '',
    createdBy: r.createdBy?.name?.fullName ?? '',
    location: r.location ?? '',
    status: r.status === 'draft' ? 'Draft' : 'Sent',
    nature: r.description || r.note || '',
    firstAid: r.firstAid ?? '',
    witnesses: Array.isArray(r.witness)
      ? r.witness.map(w => w.name?.fullName).filter(Boolean)
      : r.witness?.name?.fullName ? [r.witness.name.fullName] : [],
    staffPresent: Array.isArray(r.staffPresent)
      ? r.staffPresent.map(s => s.name?.fullName).filter(Boolean)
      : [],
    acknowledgedBy: r.acknowledgedBy?.name?.fullName ?? undefined,
    acknowledgedAt: r.acknowledgedAt ?? undefined,
    parentsNotified: r.parentsNotified ?? '',
    lado: r.lado ?? false,
    ofsted: r.ofsted ?? false,
    riddor: r.riddor ?? false,
    onArrival: r.onArrival ?? false,
    sentAt: r.sentAt ?? undefined,
    siteId: r.site?.siteId ?? '',
    siteName: r.site?.title ?? '',
  }
}

async function fetchGraphQL(token, query, variables) {
  const response = await fetch(FAMLY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Famly-Accesstoken': token,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!response.ok) {
    throw new Error(`Famly API HTTP error: ${response.status}`)
  }
  const json = await response.json()
  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL error')
  }
  return json.data
}

async function fetchAllReports(token, siteIds, from, to) {
  const all = []
  let cursor = null
  let pages = 0
  const pageSize = 100
  const maxPages = 200 // safety cap: 20,000 records

  do {
    const data = await fetchGraphQL(token, REPORTS_QUERY, {
      siteIds,
      dateRange: from && to ? { from, to } : null,
      cursor,
      pageSize,
    })
    const overview = data?.accidentReports?.listBySiteIds
    if (!overview) break
    all.push(...(overview.result || []))
    cursor = overview.next
    pages++
  } while (cursor && pages < maxPages)

  return all
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { siteId, siteIds, from, to } = req.query

  const ids = siteIds
    ? siteIds.split(',').map(s => s.trim()).filter(Boolean)
    : siteId
      ? [siteId]
      : []

  if (ids.length === 0) {
    return res.status(400).json({ error: 'siteId or siteIds is required' })
  }

  const token = process.env.FAMLY_ACCESS_TOKEN
  if (!token) {
    return res.status(503).json({ error: 'FAMLY_ACCESS_TOKEN not configured' })
  }

  try {
    const records = await fetchAllReports(token, ids, from, to)
    return res.status(200).json(records.map(normalise))
  } catch (err) {
    console.error('[famly-incidents] error:', err)
    return res.status(502).json({ error: err.message ?? 'Unknown error' })
  }
}
