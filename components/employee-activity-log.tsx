"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  RefreshCw,
  LogIn,
  LogOut,
  CalendarDays,
  Gift,
  FileText,
  Download,
  Eye,
  Mail,
  CheckCircle,
  XCircle,
  Edit,
  Clock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRealtimeMyAuditLogs } from "@/hooks/use-realtime-audit-logs"
import { cn } from "@/lib/utils"

interface EmployeeActivityLogProps {
  userId: string | null
}

function getActionIcon(action: string, entityType: string) {
  if (action === "login") return <LogIn className="h-4 w-4" />
  if (action === "logout") return <LogOut className="h-4 w-4" />
  if (entityType === "leave") return <CalendarDays className="h-4 w-4" />
  if (entityType === "bonus") return <Gift className="h-4 w-4" />
  if (entityType === "payslip" || entityType === "payroll") return <FileText className="h-4 w-4" />
  if (action.includes("downloaded")) return <Download className="h-4 w-4" />
  if (action.includes("viewed")) return <Eye className="h-4 w-4" />
  if (action.includes("emailed")) return <Mail className="h-4 w-4" />
  if (action.includes("approved")) return <CheckCircle className="h-4 w-4" />
  if (action.includes("rejected")) return <XCircle className="h-4 w-4" />
  if (action.includes("updated")) return <Edit className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

function getActionColor(action: string): string {
  if (action === "login") return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
  if (action === "logout") return "text-gray-600 bg-gray-50 dark:bg-gray-950/30"
  if (action.includes("approved")) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
  if (action.includes("rejected")) return "text-red-600 bg-red-50 dark:bg-red-950/30"
  if (action.includes("requested")) return "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
  if (action.includes("downloaded") || action.includes("viewed")) return "text-blue-600 bg-blue-50 dark:bg-blue-950/30"
  return "text-gray-600 bg-gray-50 dark:bg-gray-950/30"
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function EmployeeActivityLog({ userId }: EmployeeActivityLogProps) {
  const { logs, loading, error, refetch } = useRealtimeMyAuditLogs(userId, 30)

  if (!userId) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              My Activity Log
              <Badge variant="outline" className="ml-1 text-emerald-600 border-emerald-300 text-[10px]">
                <span className="relative flex h-1.5 w-1.5 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live
              </Badge>
            </CardTitle>
            <CardDescription>Your recent activities in the system</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch} className="h-8 w-8">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Failed to load activity log</p>
            <Button variant="link" size="sm" onClick={refetch} className="mt-2">
              Try again
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No activity recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0",
                      getActionColor(log.action),
                    )}
                  >
                    {getActionIcon(log.action, log.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{formatAction(log.action)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                        {log.entity_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
