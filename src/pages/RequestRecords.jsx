import { useState } from 'react'
import { Header } from '../components/Header'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { nurseries } from '../data/nurseries'
import { checkTypes } from '../data/checklists'
import { storage } from '../lib/storage'
import { supabase } from '../lib/supabase'

export function RequestRecords() {
  const [nursery, setNursery] = useState(() => storage.getLastNursery() || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState(null)
  const [recordCount, setRecordCount] = useState(null)

  const isValid = nursery && startDate && endDate

  const handleDownload = async () => {
    if (!isValid) return

    setIsDownloading(true)
    setError(null)
    setRecordCount(null)

    try {
      if (!supabase) {
        setError('Database not configured. Running in offline mode.')
        setIsDownloading(false)
        return
      }

      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const { data, error: queryError } = await supabase
        .from('checks')
        .select('*')
        .eq('nursery', nursery)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true })

      if (queryError) throw queryError

      if (!data || data.length === 0) {
        setError('No records found for the selected date range.')
        setIsDownloading(false)
        return
      }

      setRecordCount(data.length)

      // Build CSV
      const csvRows = [
        ['Date', 'Time', 'Nursery', 'Room', 'Check Type', 'Completed By', 'Status', 'Issues', 'Items'].join(',')
      ]

      data.forEach(check => {
        const date = new Date(check.created_at)
        const dateStr = date.toLocaleDateString('en-GB')
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        const checkName = checkTypes[check.check_type]?.shortName || check.check_type
        const status = check.has_issues ? 'Issues Found' : 'All OK'

        const failedItems = (check.items || [])
          .filter(item => item.status === 'fail')
          .map(item => {
            const note = item.note ? ` (${item.note})` : ''
            return `${item.text}${note}`
          })
          .join('; ')

        const row = [
          dateStr,
          timeStr,
          check.nursery,
          check.room,
          checkName,
          check.completed_by,
          status,
          failedItems || 'None',
          (check.items || []).length + ' items checked',
        ].map(val => `"${String(val).replace(/"/g, '""')}"`)

        csvRows.push(row.join(','))
      })

      const csv = csvRows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${nursery.replace(/\s+/g, '-')}_checks_${startDate}_to_${endDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading records:', err)
      setError('Failed to download records. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="📥 Download Records" showBack />

      <div className="px-4 py-6 max-w-md mx-auto">
        <Card>
          <div className="space-y-5">
            <p className="text-gray-600 text-sm">
              Download compliance check records as a CSV file. Select a nursery and date range.
            </p>

            <Select
              label="Nursery"
              value={nursery}
              onChange={setNursery}
              options={nurseries}
              placeholder="Select nursery"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="From date"
                type="date"
                value={startDate}
                onChange={setStartDate}
                required
              />
              <Input
                label="To date"
                type="date"
                value={endDate}
                onChange={setEndDate}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {recordCount !== null && !error && (
              <div className="p-3 bg-hop-apple/10 text-hop-apple rounded-lg text-sm text-center">
                ✅ Downloaded {recordCount} record{recordCount !== 1 ? 's' : ''}
              </div>
            )}

            <Button
              color="forest"
              size="large"
              fullWidth
              disabled={!isValid || isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? 'Downloading...' : '📥 Download CSV'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
