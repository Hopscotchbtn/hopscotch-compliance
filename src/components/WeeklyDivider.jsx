import { Badge } from './ui/Badge'

export function WeeklyDivider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-hop-marmalade/30" />
      <Badge color="marmalade">Weekly Checks</Badge>
      <div className="flex-1 h-px bg-hop-marmalade/30" />
    </div>
  )
}
