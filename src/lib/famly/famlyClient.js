// Direct browser-to-Famly GraphQL client.
// Data travels browser → Famly API → browser only.
// Vercel infrastructure never sees any personal data.

const FAMLY_API = 'https://famlyapi.famly.co/v1/graphql'

const SESSION_KEY = 'famly_access_token'

export function getStoredToken() {
  return sessionStorage.getItem(SESSION_KEY) ?? ''
}

export function storeToken(token) {
  sessionStorage.setItem(SESSION_KEY, token.trim())
}

export function clearToken() {
  sessionStorage.removeItem(SESSION_KEY)
}

async function gql(token, query, variables = {}) {
  const res = await fetch(FAMLY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Famly-Accesstoken': token,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) throw new Error(`Famly API returned ${res.status}`)

  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error')
  return json.data
}

const SITES_QUERY = `
  query ListSites {
    me {
      profile {
        sites { siteId title }
      }
    }
  }
`

export async function fetchSites(token) {
  const data = await gql(token, SITES_QUERY)
  return (data?.me?.profile?.sites ?? []).map(s => ({ id: s.siteId, name: s.title }))
}

const INCIDENTS_QUERY = `
  query AccidentReports($siteIds: [ID!]!, $from: Date, $to: Date, $nextToken: String) {
    accidentReports {
      listBySiteIds(siteIds: $siteIds, from: $from, to: $to, nextToken: $nextToken) {
        result {
          reportId kind happenedAt createdAt status location nature firstAid
          site { siteId title }
          child { id name { fullName } }
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

function normalise(r) {
  return {
    id: r.reportId ?? r.id,
    childName: r.child?.name?.fullName ?? 'Unknown',
    childId: r.child?.id ?? null,
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
  }
}

export async function fetchIncidents(token, siteId, from, to) {
  const records = []
  let cursor = null

  do {
    const data = await gql(token, INCIDENTS_QUERY, {
      siteIds: [siteId],
      from,
      to,
      ...(cursor ? { nextToken: cursor } : {}),
    })
    const page = data?.accidentReports?.listBySiteIds ?? { result: [], nextToken: null }
    records.push(...(page.result ?? []))
    cursor = page.nextToken ?? null
  } while (cursor)

  return records.map(normalise)
}
