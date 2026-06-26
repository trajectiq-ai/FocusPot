'use client'

// Company Admin → Employees tab
// PRIVACY SHIELD: This tab shows DIRECTORY info only (name, email, title,
// team, role, active status, joined date). It NEVER shows focus hours,
// sessions, streaks, or points — those stay private to each employee.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  UserCog,
  ShieldCheck,
  Lock,
  Loader2,
  Users,
  Copy,
  Check,
  UserMinus,
  UserCheck,
  AlertTriangle,
  Mail,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getColor, getInitials } from '@/lib/colors'
import { useAuthStore } from '@/lib/store'
import type {
  EmployeeDirectoryItem,
  EmployeesResponse,
  TeamManageItem,
} from './types'

type AddEmployeeResult = {
  employee: {
    id: string
    name: string
    email: string
    title: string
    role: string
    avatarColor: string
    teamId: string | null
    tempPassword: string
  }
}

type ImportResult = {
  successCount: number
  errors: { row: number; email?: string; error: string }[]
  created: {
    name: string
    email: string
    teamName: string
    tempPassword: string
  }[]
  seats: number
  employeeCount: number
}

export function EmployeesTab({
  onRefresh,
  adminId,
}: {
  onRefresh: () => void
  adminId: string
}) {
  const { user } = useAuthStore()
  const [data, setData] = useState<EmployeesResponse | null>(null)
  const [teams, setTeams] = useState<TeamManageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')

  // Dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [changeTeamOpen, setChangeTeamOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [activeEmployee, setActiveEmployee] = useState<EmployeeDirectoryItem | null>(null)
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ name: string; email: string; password: string } | null>(null)

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const [empRes, teamsRes] = await Promise.all([
        fetch('/api/admin/employees', { cache: 'no-store' }),
        fetch('/api/admin/teams', { cache: 'no-store' }),
      ])
      if (!empRes.ok) {
        const j = await empRes.json().catch(() => ({}))
        throw new Error(j.error || `Failed (${empRes.status})`)
      }
      const empJson = (await empRes.json()) as EmployeesResponse
      setData(empJson)
      if (teamsRes.ok) {
        const tJson = await teamsRes.json()
        setTeams(tJson.teams || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.employees.filter((e) => {
      const matchesSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        (e.title || '').toLowerCase().includes(search.toLowerCase())
      const matchesTeam = teamFilter === 'all' || e.teamId === teamFilter
      return matchesSearch && matchesTeam
    })
  }, [data, search, teamFilter])

  const seatsPct = data
    ? Math.min(100, data.seats > 0 ? Math.round((data.employeeCount / data.seats) * 100) : 0)
    : 0
  const seatsLeft = data ? data.seats - data.employeeCount : 0

  const handleAdded = (result: AddEmployeeResult) => {
    setAddOpen(false)
    setTempPasswordInfo({
      name: result.employee.name,
      email: result.employee.email,
      password: result.employee.tempPassword,
    })
    fetchData()
    onRefresh()
    toast.success('Employee added')
  }

  const handleEdit = (emp: EmployeeDirectoryItem) => {
    setActiveEmployee(emp)
    setEditOpen(true)
  }
  const handleChangeTeam = (emp: EmployeeDirectoryItem) => {
    setActiveEmployee(emp)
    setChangeTeamOpen(true)
  }
  const handleRemove = (emp: EmployeeDirectoryItem) => {
    setActiveEmployee(emp)
    setRemoveOpen(true)
  }

  const handleToggleActive = async (emp: EmployeeDirectoryItem) => {
    const next = !emp.active
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to update')
      toast.success(next ? 'Employee reactivated' : 'Employee deactivated')
      fetchData()
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update employee')
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/employees/export', { cache: 'no-store' })
      const ct = res.headers.get('content-type') || ''
      if (!res.ok || !ct.includes('text/csv')) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to export')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Prefer the filename from Content-Disposition, fall back to a default
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="?([^";]+)"?/i)
      a.download = match ? match[1] : 'focuspot-employees.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export employees')
    }
  }

  const handleImportComplete = (result: ImportResult) => {
    setImportOpen(false)
    setImportResult(result)
    fetchData()
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Privacy Shield header */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20">
        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            Directory only — focus data stays private
          </p>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70 mt-0.5">
            This view shows names, emails, titles, teams, and status only. Individual focus hours,
            sessions, streaks, and points are never visible to admins.
          </p>
        </div>
      </div>

      {/* Header / actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-500" /> Employee Directory
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add, edit, and manage your team members.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={!data}
            className="gap-1.5"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!data}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!data || seatsLeft <= 0}
          >
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Seats progress */}
      {data && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold">Seats used</p>
                <p className="text-xs text-muted-foreground">
                  {data.employeeCount} active employee{data.employeeCount === 1 ? '' : 's'} of{' '}
                  {data.seats} seats on your plan
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {data.employeeCount}
                  <span className="text-base text-muted-foreground font-normal"> / {data.seats}</span>
                </p>
                <p className="text-xs text-muted-foreground">{seatsLeft} available</p>
              </div>
            </div>
            <Progress
              value={seatsPct}
              className="h-2 mt-3"
            />
            {seatsLeft <= 2 && seatsLeft > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                You&apos;re almost out of seats. Only {seatsLeft} left.
              </p>
            )}
            {seatsLeft <= 0 && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Seat limit reached. Upgrade your plan in Settings to add more employees.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search / filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getColor(t.color).dot}`} />
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading directory…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-rose-200 dark:border-rose-800/50">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No employees match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try clearing the search or team filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="max-h-[32rem] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((emp) => (
                      <EmployeeRow
                        key={emp.id}
                        emp={emp}
                        isSelf={emp.id === (user?.id || adminId)}
                        onEdit={() => handleEdit(emp)}
                        onChangeTeam={() => handleChangeTeam(emp)}
                        onToggleActive={() => handleToggleActive(emp)}
                        onRemove={() => handleRemove(emp)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filtered.map((emp) => (
              <EmployeeMobileCard
                key={emp.id}
                emp={emp}
                isSelf={emp.id === (user?.id || adminId)}
                onEdit={() => handleEdit(emp)}
                onChangeTeam={() => handleChangeTeam(emp)}
                onToggleActive={() => handleToggleActive(emp)}
                onRemove={() => handleRemove(emp)}
              />
            ))}
          </div>
        </>
      )}

      {/* Add Employee dialog */}
      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        teams={teams}
        onAdded={handleAdded}
      />

      {/* Edit details dialog */}
      {activeEmployee && (
        <EditEmployeeDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          employee={activeEmployee}
          isSelf={activeEmployee.id === (user?.id || adminId)}
          onSaved={() => {
            setEditOpen(false)
            fetchData()
            onRefresh()
          }}
        />
      )}

      {/* Change team dialog */}
      {activeEmployee && (
        <ChangeTeamDialog
          open={changeTeamOpen}
          onOpenChange={setChangeTeamOpen}
          employee={activeEmployee}
          teams={teams}
          onSaved={() => {
            setChangeTeamOpen(false)
            fetchData()
            onRefresh()
          }}
        />
      )}

      {/* Remove confirm */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" /> Remove employee?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              <span className="font-semibold text-foreground">{activeEmployee?.name}</span> (
              {activeEmployee?.email}) and all of their focus sessions and notifications. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async (e) => {
                e.preventDefault()
                if (!activeEmployee) return
                try {
                  const res = await fetch(`/api/admin/employees/${activeEmployee.id}`, {
                    method: 'DELETE',
                  })
                  const j = await res.json().catch(() => ({}))
                  if (!res.ok) throw new Error(j.error || 'Failed to remove')
                  toast.success('Employee removed')
                  setRemoveOpen(false)
                  fetchData()
                  onRefresh()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to remove employee')
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> Remove permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temp password success dialog */}
      <TempPasswordDialog
        key={tempPasswordInfo?.password || 'empty'}
        info={tempPasswordInfo}
        onClose={() => setTempPasswordInfo(null)}
      />

      {/* CSV import dialog */}
      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        teams={teams}
        onImported={handleImportComplete}
      />

      {/* CSV import results */}
      <ImportResultDialog
        result={importResult}
        onClose={() => setImportResult(null)}
      />
    </div>
  )
}

function EmployeeRow({
  emp,
  isSelf,
  onEdit,
  onChangeTeam,
  onToggleActive,
  onRemove,
}: {
  emp: EmployeeDirectoryItem
  isSelf: boolean
  onEdit: () => void
  onChangeTeam: () => void
  onToggleActive: () => void
  onRemove: () => void
}) {
  const c = getColor(emp.avatarColor || 'violet')
  const team = emp.team
  const teamColor = team ? getColor(team.color) : null

  return (
    <TableRow className={isSelf ? 'bg-violet-50/40 dark:bg-violet-950/15' : ''}>
      <TableCell className="pl-6">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center text-xs font-semibold`}
          >
            {getInitials(emp.name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate flex items-center gap-1.5">
              {emp.name}
              {isSelf && (
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 text-[10px] px-1.5 py-0">
                  You
                </Badge>
              )}
              {emp.role === 'COMPANY_ADMIN' && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] px-1.5 py-0">
                  Admin
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm">{emp.title || <span className="text-muted-foreground">—</span>}</span>
      </TableCell>
      <TableCell>
        {team ? (
          <Badge variant="outline" className="gap-1.5">
            <span className={`w-2 h-2 rounded-full ${teamColor?.dot}`} />
            {team.name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No team</span>
        )}
      </TableCell>
      <TableCell>
        {emp.active ? (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> Active
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1" /> Inactive
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground tabular-nums">
        {format(new Date(emp.createdAt), 'MMM d, yyyy')}
      </TableCell>
      <TableCell className="pr-6 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4" /> Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChangeTeam} disabled={isSelf}>
              <UserCog className="w-4 h-4" /> Change team
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onToggleActive}
              disabled={isSelf}
            >
              {emp.active ? (
                <>
                  <UserMinus className="w-4 h-4" /> Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Reactivate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={onRemove}
              disabled={isSelf}
            >
              <Trash2 className="w-4 h-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function EmployeeMobileCard({
  emp,
  isSelf,
  onEdit,
  onChangeTeam,
  onToggleActive,
  onRemove,
}: {
  emp: EmployeeDirectoryItem
  isSelf: boolean
  onEdit: () => void
  onChangeTeam: () => void
  onToggleActive: () => void
  onRemove: () => void
}) {
  const c = getColor(emp.avatarColor || 'violet')
  const team = emp.team
  const teamColor = team ? getColor(team.color) : null

  return (
    <Card className={isSelf ? 'border-violet-200 dark:border-violet-800/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center text-sm font-semibold`}
          >
            {getInitials(emp.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium truncate">{emp.name}</p>
              {isSelf && (
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 text-[10px] px-1.5 py-0">
                  You
                </Badge>
              )}
              {emp.role === 'COMPANY_ADMIN' && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] px-1.5 py-0">
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3" /> {emp.email}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {emp.title && (
                <span className="text-xs text-muted-foreground">{emp.title}</span>
              )}
              {team && (
                <Badge variant="outline" className="gap-1.5 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${teamColor?.dot}`} />
                  {team.name}
                </Badge>
              )}
              {emp.active ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px]">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground text-[10px]">Inactive</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Joined {format(new Date(emp.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onChangeTeam} disabled={isSelf}>
                <UserCog className="w-4 h-4" /> Change team
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive} disabled={isSelf}>
                {emp.active ? (
                  <>
                    <UserMinus className="w-4 h-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" /> Reactivate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onRemove} disabled={isSelf}>
                <Trash2 className="w-4 h-4" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

function AddEmployeeDialog({
  open,
  onOpenChange,
  teams,
  onAdded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  teams: TeamManageItem[]
  onAdded: (result: AddEmployeeResult) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setTitle('')
      setTeamId(teams[0]?.id || '')
    }
  }, [open, teams])

  const submit = async () => {
    if (!name.trim()) return toast.error('Please enter a name')
    if (!email.trim()) return toast.error('Please enter an email')
    if (!teamId) return toast.error('Please select a team')

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          title: title.trim(),
          teamId,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to add employee')
      onAdded(j as AddEmployeeResult)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add employee')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </span>
            Add Employee
          </DialogTitle>
          <DialogDescription>
            Invite a new team member. A temporary password will be generated for them to use on
            first sign-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Full name</Label>
            <Input
              id="emp-name"
              placeholder="e.g. Jordan Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              placeholder="jordan@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-title">Job title</Label>
            <Input
              id="emp-title"
              placeholder="e.g. Senior Designer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-team">Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="emp-team" className="w-full">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getColor(t.color).dot}`} />
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || teams.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Adding…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Employee
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  isSelf,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee: EmployeeDirectoryItem
  isSelf: boolean
  onSaved: () => void
}) {
  const [name, setName] = useState(employee.name)
  const [title, setTitle] = useState(employee.title || '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(employee.name)
    setTitle(employee.title || '')
  }, [employee])

  const submit = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), title: title.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to update')
      toast.success('Details updated')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-muted-foreground" /> Edit details
          </DialogTitle>
          <DialogDescription>
            {isSelf
              ? 'Editing your own profile. You can only change name and title.'
              : `Update name and job title for ${employee.name}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Job title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Designer"
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            Email: <span className="font-medium text-foreground">{employee.email}</span> (not editable)
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChangeTeamDialog({
  open,
  onOpenChange,
  employee,
  teams,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee: EmployeeDirectoryItem
  teams: TeamManageItem[]
  onSaved: () => void
}) {
  const [teamId, setTeamId] = useState(employee.teamId || teams[0]?.id || '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setTeamId(employee.teamId || teams[0]?.id || '')
  }, [employee, teams])

  const submit = async () => {
    if (!teamId) return toast.error('Please select a team')
    if (teamId === employee.teamId) {
      onOpenChange(false)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to update team')
      toast.success('Team updated')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-muted-foreground" /> Change team
          </DialogTitle>
          <DialogDescription>
            Move <span className="font-medium text-foreground">{employee.name}</span> to a different
            team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ct-team">New team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="ct-team" className="w-full">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getColor(t.color).dot}`} />
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Move to team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TempPasswordDialog({
  info,
  onClose,
}: {
  info: { name: string; email: string; password: string } | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <Dialog open={!!info} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            Employee added — share these credentials
          </DialogTitle>
          <DialogDescription>
            A temporary password was generated for{' '}
            <span className="font-medium text-foreground">{info?.name}</span>. Show this once and
            share it securely — they&apos;ll be asked to change it on first sign-in.
          </DialogDescription>
        </DialogHeader>

        {info && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sign-in email</Label>
              <div className="flex items-center gap-2">
                <Input value={info.email} readOnly className="font-mono text-sm bg-muted/40" />
                <Button variant="outline" size="icon" onClick={() => copy(info.email)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Temporary password</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={info.password}
                  readOnly
                  className="font-mono text-sm bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(info.password)}
                  className={copied ? 'text-emerald-600 border-emerald-300' : ''}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-200">
                For security, this password won&apos;t be shown again. Send it to{' '}
                <span className="font-medium">{info.name}</span> via your company&apos;s secure
                channel (1Password, Slack DM, etc.) — not plain email.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
            <Check className="w-4 h-4" /> I&apos;ve shared it securely
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// CSV import dialog + results dialog
// ============================================================

function downloadTextFile(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function ImportCsvDialog({
  open,
  onOpenChange,
  teams,
  onImported,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  teams: TeamManageItem[]
  onImported: (result: ImportResult) => void
}) {
  const [csv, setCsv] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) setCsv('')
  }, [open])

  const handleDownloadTemplate = () => {
    // If teams exist, build a template that lists one team name as an example
    const teamExample = teams[0]?.name || 'Engineering'
    const template = `name,email,title,teamId
Jordan Rivera,jordan@yourcompany.com,Senior Designer,
Sam Chen,sam@yourcompany.com,Product Manager,${teamExample}`
    downloadTextFile('focuspot-employees-template.csv', template)
    toast.success('Template downloaded')
  }

  const handleDownloadCurrent = async () => {
    try {
      const res = await fetch('/api/admin/employees/export', { cache: 'no-store' })
      const ct = res.headers.get('content-type') || ''
      if (!res.ok || !ct.includes('text/csv')) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to export')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="?([^";]+)"?/i)
      a.download = match ? match[1] : 'focuspot-employees.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Current employees downloaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export')
    }
  }

  const handleImport = async () => {
    if (!csv.trim()) {
      toast.error('Please paste CSV content first')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed to import')
      onImported(j as ImportResult)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to import')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </span>
            Import employees from CSV
          </DialogTitle>
          <DialogDescription>
            Bulk-add employees by pasting CSV text. Each row creates an employee with a
            random temporary password. <span className="font-medium">No data is uploaded</span>{' '}
            until you click Import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format helper */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> CSV format
            </p>
            <p className="text-xs text-muted-foreground">
              Header row required: <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">name,email,title,teamId</code>.
              Only <span className="font-medium">name</span> and <span className="font-medium">email</span> are required —
              <span className="font-medium"> title</span> and <span className="font-medium">teamId</span> are optional. The{' '}
              <span className="font-medium">teamId</span> column accepts either a team ID or a team name.
            </p>
            {teams.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {teams.slice(0, 6).map((t) => (
                  <Badge key={t.id} variant="outline" className="text-[10px] gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${getColor(t.color).dot}`} />
                    {t.name}
                  </Badge>
                ))}
                {teams.length > 6 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{teams.length - 6} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Download template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCurrent}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download current
            </Button>
          </div>

          {/* CSV input */}
          <div className="space-y-2">
            <Label htmlFor="csv-input">Paste CSV content</Label>
            <Textarea
              id="csv-input"
              placeholder={`name,email,title,teamId\nJordan Rivera,jordan@yourcompany.com,Senior Designer,\nSam Chen,sam@yourcompany.com,Product Manager,`}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {csv.trim() ? `${csv.trim().split('\n').length} line(s)` : 'Empty'} · each row
              becomes one employee.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              Seat limit: each successful row consumes one seat. Rows that exceed your plan&apos;s
              seat limit will be rejected. Duplicate emails (already in the system or in the
              same CSV) are also rejected.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={submitting || !csv.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Import employees
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportResultDialog({
  result,
  onClose,
}: {
  result: ImportResult | null
  onClose: () => void
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  const copyAll = async () => {
    if (!result) return
    const lines = result.created.map(
      (c) => `${c.name},${c.email},${c.teamName},${c.tempPassword}`,
    )
    try {
      await navigator.clipboard.writeText(
        `name,email,team,password\n${lines.join('\n')}`,
      )
      toast.success('All credentials copied to clipboard')
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <Dialog open={!!result} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </span>
            Import complete
          </DialogTitle>
          <DialogDescription>
            Review the results. Share the temporary passwords with each new employee via a
            secure channel — they will be asked to change it on first sign-in.
          </DialogDescription>
        </DialogHeader>

        {result && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Created</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {result.successCount}
                </p>
              </div>
              <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20 p-3">
                <p className="text-[10px] text-rose-700 dark:text-rose-300 uppercase tracking-wide">Failed</p>
                <p className="text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                  {result.errors.length}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Seats used</p>
                <p className="text-2xl font-bold tabular-nums">
                  {result.employeeCount}
                  <span className="text-sm text-muted-foreground font-normal"> / {result.seats}</span>
                </p>
              </div>
            </div>

            {/* Created employees with temp passwords */}
            {result.created.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> New employees &amp; credentials
                  </p>
                  <Button variant="outline" size="sm" onClick={copyAll} className="h-7 gap-1">
                    <Copy className="w-3.5 h-3.5" /> Copy all
                  </Button>
                </div>
                <div className="rounded-lg border border-border/60 max-h-64 overflow-y-auto scrollbar-thin divide-y divide-border/40">
                  {result.created.map((c, idx) => (
                    <div key={`${c.email}-${idx}`} className="p-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {c.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {c.teamName}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          value={c.tempPassword}
                          readOnly
                          className="h-7 w-32 font-mono text-xs bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => copy(c.tempPassword, idx)}
                        >
                          {copiedIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4" /> Errors ({result.errors.length})
                </p>
                <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/10 max-h-48 overflow-y-auto scrollbar-thin divide-y divide-rose-200/40 dark:divide-rose-800/30">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="p-2.5 text-xs">
                      <p className="font-mono text-rose-700 dark:text-rose-300">
                        Row {err.row}
                        {err.email && ` · ${err.email}`}
                      </p>
                      <p className="text-rose-900/80 dark:text-rose-200/70 mt-0.5">{err.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.successCount === 0 && result.errors.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No rows processed. Check your CSV format and try again.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
            <Check className="w-4 h-4" /> Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
