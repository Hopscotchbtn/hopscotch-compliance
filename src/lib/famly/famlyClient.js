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
  const body = JSON.stringify({ query, variables })
  console.log('[Famly GQL] Sending request:', { query: query.trim().slice(0, 80), variables })

  const res = await fetch(FAMLY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Famly-Accesstoken': token,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[Famly GQL] Error response:', res.status, text)
    throw new Error(`Famly API returned ${res.status}: ${text}`)
  }

  const json = await res.json()
  if (json.errors) {
    console.error('[Famly GQL] GraphQL errors:', json.errors)
    throw new Error(json.errors[0]?.message ?? 'GraphQL error')
  }
  console.log('[Famly GQL] Success, data keys:', Object.keys(json.data ?? {}))
  return json.data
}

// ── Schema discovery (runs once on connect) ──────────────────────────

const INTROSPECT_ROOT = `
  query IntrospectRoot {
    __schema {
      queryType {
        fields {
          name
          args { name type { name kind ofType { name kind ofType { name kind } } } }
          type { name kind ofType { name kind } }
        }
      }
    }
  }
`

const INTROSPECT_SITE = `
  query IntrospectSite {
    __type(name: "Site") {
      name
      fields {
        name
        type { name kind ofType { name kind } }
      }
    }
  }
`

const INTROSPECT_SITE_QUERIES = `
  query IntrospectSiteQueries {
    __type(name: "SiteQueries") {
      fields {
        name
        args {
          name
          type { name kind ofType { name kind ofType { name kind } } }
        }
        type { name kind ofType { name kind ofType { name kind } } }
      }
    }
  }
`

export async function debugIntrospect(token) {
  try {
    const [rootData, siteData, siteQueriesData] = await Promise.all([
      gql(token, INTROSPECT_ROOT),
      gql(token, INTROSPECT_SITE),
      gql(token, INTROSPECT_SITE_QUERIES),
    ])

    const rootFields = rootData?.__schema?.queryType?.fields ?? []
    console.log('[Famly Schema] Root query fields:', rootFields.map(f => f.name))
    console.log('[Famly Schema] Site type fields:', siteData?.__type?.fields?.map(f => `${f.name}: ${f.type?.name || f.type?.ofType?.name || f.type?.kind}`))

    const sqFields = siteQueriesData?.__type?.fields ?? []
    console.log('[Famly Schema] SiteQueries methods:', sqFields.map(f => ({
      name: f.name,
      args: f.args?.map(a => `${a.name}: ${a.type?.name || a.type?.ofType?.name || a.type?.kind}`),
      returns: f.type?.name || f.type?.ofType?.name || f.type?.kind
    })))

    return { rootFields, siteData, sqFields }
  } catch (err) {
    console.error('[Famly Schema] Introspection failed:', err.message)
    return null
  }
}

// ── Sites ────────────────────────────────────────────────────────────

// We don't yet know the correct sites query. Run introspection first,
// then try to build the query dynamically.
export async function fetchSites(token) {
  const schema = await debugIntrospect(token)

  // Also introspect SiteResult to find its fields
  try {
    const sr = await gql(token, `{
      __type(name: "SiteResult") {
        fields { name type { name kind ofType { name kind } } }
      }
    }`)
    console.log('[Famly Schema] SiteResult fields:', sr?.__type?.fields?.map(f => `${f.name}: ${f.type?.name || f.type?.ofType?.name || f.type?.kind}`))
  } catch {}

  // Try nested patterns: sites { list { result { siteId title } } }
  const patterns = [
    { query: `{ sites { list { result { siteId title } } } }`, extract: d => d?.sites?.list?.result },
    { query: `{ sites { list { sites { siteId title } } } }`, extract: d => d?.sites?.list?.sites },
    { query: `{ sites { list { data { siteId title } } } }`, extract: d => d?.sites?.list?.data },
    { query: `{ sites { list { items { siteId title } } } }`, extract: d => d?.sites?.list?.items },
  ]

  for (const { query, extract } of patterns) {
    try {
      console.log('[Famly] Trying:', query.slice(0, 70))
      const data = await gql(token, query)
      const sites = extract(data)
      if (Array.isArray(sites) && sites.length > 0) {
        const result = sites.map(s => ({ id: s.siteId, name: s.title }))
        console.log('[Famly] Sites fetched:', result)
        return result
      }
    } catch (err) {
      console.log('[Famly] Failed:', err.message?.slice(0, 120))
    }
  }

  console.error('[Famly] Could not fetch sites.')
  return []
}

// ── Incidents ────────────────────────────────────────────────────────

const INCIDENTS_QUERY = `
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
    happenedAt: r.date && r.time ? `${r.date}T${r.time}` : (r.date ?? r.createdAt),
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

export async function fetchIncidents(token, siteId, from, to) {
  const data = await gql(token, INCIDENTS_QUERY, { siteIds: [siteId] })
  const page = data?.accidentReports?.listBySiteIds ?? { result: [] }
  const records = page.result ?? []
  console.log(`[Famly] Fetched ${records.length} records for site ${siteId}, has next: ${!!page.next}`)

  // Filter to date range client-side
  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null

  const filtered = records.filter(r => {
    const d = new Date(r.date ?? r.createdAt)
    if (fromDate && d < fromDate) return false
    if (toDate && d > toDate) return false
    return true
  })

  console.log(`[Famly] Total: ${records.length}, after date filter: ${filtered.length}`)
  return filtered.map(normalise)
}
