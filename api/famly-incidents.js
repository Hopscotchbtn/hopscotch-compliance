const FAMLY_API = 'https://famlyapi.famly.co/v1/graphql'

const QUERY = `
  query AccidentReports($siteIds: [SiteId!]!) {
    accidentReports {
      listBySiteIds(siteIds: $siteIds) {
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
    const response = await fetch(FAMLY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Famly-Accesstoken': token,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { siteIds: [siteId] },
      }),
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `Famly API HTTP error: ${response.status}` })
    }

    const json = await response.json()
    if (json.errors) {
      return res.status(400).json({ error: json.errors[0]?.message ?? 'GraphQL error' })
    }

    const records = json.data?.accidentReports?.listBySiteIds?.result ?? []

    // Filter by date range client-side
    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(to) : null

    const filtered = records.filter(r => {
      const d = new Date(r.date ?? r.createdAt)
      if (fromDate && d < fromDate) return false
      if (toDate && d > toDate) return false
      return true
    })

    return res.status(200).json(filtered.map(normalise))
  } catch (err) {
    console.error('[famly-incidents] error:', err)
    return res.status(502).json({ error: err.message ?? 'Unknown error' })
  }
}
