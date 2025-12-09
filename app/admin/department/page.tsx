"use client"

import * as React from "react"
import {
  MoreHorizontal,
  Plus,
  Building2,
  Users,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Search,
  Grid3X3,
  List,
  Banknote,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/ui/stat-card"
import { usePayrollStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, getInitials, PESO_SIGN } from "@/lib/utils"

export default function DepartmentPage() {
  const { departments, employees, addDepartment, updateDepartment, deleteDepartment } = usePayrollStore()
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [editingDepartment, setEditingDepartment] = React.useState<string | null>(null)
  const [viewDepartment, setViewDepartment] = React.useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [departmentToDelete, setDepartmentToDelete] = React.useState<{ id: string; name: string } | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const { toast } = useToast()

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    managerId: "",
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter((e) => e.department === deptName)
    const activeEmployees = deptEmployees.filter((e) => e.status === "active")
    const totalSalary = activeEmployees.reduce((sum, e) => sum + e.monthlySalary, 0)
    const avgSalary = activeEmployees.length > 0 ? totalSalary / activeEmployees.length : 0
    return {
      total: deptEmployees.length,
      active: activeEmployees.length,
      inactive: deptEmployees.filter((e) => e.status !== "active").length,
      totalSalary,
      avgSalary,
      employees: deptEmployees,
    }
  }

  const handleAddDepartment = () => {
    if (!formData.name) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter a department name.",
        variant: "destructive",
      })
      return
    }
    if (departments.some((d) => d.name.toLowerCase() === formData.name.toLowerCase())) {
      toast({
        title: "Department Exists",
        description: "A department with this name already exists.",
        variant: "destructive",
      })
      return
    }
    addDepartment({
      name: formData.name,
      description: formData.description,
      managerId: formData.managerId || undefined,
    })
    setIsAddDialogOpen(false)
    setFormData({ name: "", description: "", managerId: "" })
    toast({ title: "Department Added", description: "New department has been successfully created." })
  }

  const handleEditDepartment = () => {
    if (!editingDepartment || !formData.name) return
    updateDepartment(editingDepartment, {
      name: formData.name,
      description: formData.description,
      managerId: formData.managerId || undefined,
    })
    setEditingDepartment(null)
    setFormData({ name: "", description: "", managerId: "" })
    toast({ title: "Department Updated", description: "Department has been successfully updated." })
  }

  const handleDeleteDepartment = () => {
    if (!departmentToDelete) return
    const deptEmployees = employees.filter((e) => e.department === departmentToDelete.name)
    if (deptEmployees.length > 0) {
      toast({
        title: "Cannot Delete Department",
        description: `This department has ${deptEmployees.length} employees. Please reassign them first.`,
        variant: "destructive",
      })
      setDeleteDialogOpen(false)
      setDepartmentToDelete(null)
      return
    }
    deleteDepartment(departmentToDelete.id)
    setDeleteDialogOpen(false)
    setDepartmentToDelete(null)
    toast({ title: "Department Deleted", description: "Department has been successfully deleted." })
  }

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalEmployees = employees.filter((e) => e.status === "active").length
  const totalSalary = employees.filter((e) => e.status === "active").reduce((sum, e) => sum + e.monthlySalary, 0)

  if (!mounted) {
    return (
      <AdminLayout title="Departments" subtitle="Manage company departments">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Departments" subtitle={`Managing ${departments.length} departments`}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Departments"
            value={departments.length}
            icon={<Building2 className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Total Employees"
            value={totalEmployees}
            icon={<Users className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Total Payroll"
            value={formatCurrency(totalSalary)}
            icon={<Banknote className="h-5 w-5" />}
            variant="info"
          />
          <StatCard
            title="Avg per Department"
            value={Math.round(totalEmployees / (departments.length || 1))}
            description="employees"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="warning"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-accent/50 border-transparent focus-visible:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-border p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-lg h-8 px-3"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-lg h-8 px-3"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-xl">
                <DialogHeader>
                  <DialogTitle>Add New Department</DialogTitle>
                  <DialogDescription>Create a new department for your organization.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Engineering"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the department"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager">Department Head</Label>
                    <Select
                      value={formData.managerId}
                      onValueChange={(v) => setFormData({ ...formData, managerId: v })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select a manager (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter((e) => e.status === "active")
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName} - {emp.position}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={handleAddDepartment} className="rounded-xl">
                    Add Department
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDepartments.map((dept) => {
              const stats = getDepartmentStats(dept.name)
              const manager = dept.managerId ? employees.find((e) => e.id === dept.managerId) : null
              return (
                <Card
                  key={dept.id}
                  className="group overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1">
                          {dept.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setViewDepartment(dept.id)} className="rounded-lg">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setFormData({
                              name: dept.name,
                              description: dept.description || "",
                              managerId: dept.managerId || "",
                            })
                            setEditingDepartment(dept.id)
                          }}
                          className="rounded-lg"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive rounded-lg"
                          onClick={() => {
                            setDepartmentToDelete({ id: dept.id, name: dept.name })
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {manager && (
                      <div className="flex items-center gap-2.5 p-2.5 bg-accent/50 rounded-xl">
                        <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {getInitials(manager.firstName, manager.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-xs">
                          <p className="font-semibold">
                            {manager.firstName} {manager.lastName}
                          </p>
                          <p className="text-muted-foreground">Department Head</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-accent/30">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-xs">Employees</span>
                        </div>
                        <p className="text-lg font-bold">{stats.active}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-accent/30">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Banknote className="h-3.5 w-3.5" />
                          <span className="text-xs">Monthly</span>
                        </div>
                        <p className="text-lg font-bold">
                          {formatCurrency(stats.totalSalary).replace("₱", PESO_SIGN + " ")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <Card className="overflow-hidden border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Department</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead className="text-center">Employees</TableHead>
                    <TableHead className="text-right">Monthly Payroll</TableHead>
                    <TableHead className="text-right">Avg Salary</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((dept) => {
                    const stats = getDepartmentStats(dept.name)
                    const manager = dept.managerId ? employees.find((e) => e.id === dept.managerId) : null
                    return (
                      <TableRow key={dept.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{dept.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {dept.description || "No description"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {manager ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                  {getInitials(manager.firstName, manager.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {manager.firstName} {manager.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-lg font-semibold">
                            {stats.active}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(stats.totalSalary)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(stats.avgSalary)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => setViewDepartment(dept.id)} className="rounded-lg">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setFormData({
                                    name: dept.name,
                                    description: dept.description || "",
                                    managerId: dept.managerId || "",
                                  })
                                  setEditingDepartment(dept.id)
                                }}
                                className="rounded-lg"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive rounded-lg"
                                onClick={() => {
                                  setDepartmentToDelete({ id: dept.id, name: dept.name })
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {filteredDepartments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No departments found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search query" : "Get started by creating your first department"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            )}
          </div>
        )}
      </div>

      {/* View Department Dialog */}
      <Dialog open={!!viewDepartment} onOpenChange={() => setViewDepartment(null)}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Department Details</DialogTitle>
            <DialogDescription>View department information and employees</DialogDescription>
          </DialogHeader>
          {viewDepartment &&
            (() => {
              const dept = departments.find((d) => d.id === viewDepartment)
              if (!dept) return null
              const stats = getDepartmentStats(dept.name)
              const manager = dept.managerId ? employees.find((e) => e.id === dept.managerId) : null
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Building2 className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{dept.name}</h3>
                      <p className="text-sm text-muted-foreground">{dept.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-accent/50">
                      <p className="text-sm text-muted-foreground mb-1">Active Employees</p>
                      <p className="text-2xl font-bold">{stats.active}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/50">
                      <p className="text-sm text-muted-foreground mb-1">Monthly Payroll</p>
                      <p className="text-lg sm:text-xl font-bold truncate" title={formatCurrency(stats.totalSalary)}>
                        {formatCurrency(stats.totalSalary)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/50">
                      <p className="text-sm text-muted-foreground mb-1">Avg Salary</p>
                      <p className="text-lg sm:text-xl font-bold truncate" title={formatCurrency(stats.avgSalary)}>
                        {formatCurrency(stats.avgSalary)}
                      </p>
                    </div>
                  </div>
                  {/* End of stat cards change */}
                  {manager && (
                    <div className="p-4 rounded-xl border border-border">
                      <p className="text-sm text-muted-foreground mb-2">Department Head</p>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(manager.firstName, manager.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {manager.firstName} {manager.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{manager.position}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {stats.employees.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Team Members ({stats.employees.length})</p>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {stats.employees.slice(0, 10).map((emp) => (
                          <div key={emp.id} className="flex items-center justify-between p-2.5 rounded-xl bg-accent/30">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                  {getInitials(emp.firstName, emp.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {emp.firstName} {emp.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{emp.position}</p>
                              </div>
                            </div>
                            <Badge
                              variant={emp.status === "active" ? "secondary" : "outline"}
                              className="rounded-lg capitalize"
                            >
                              {emp.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog
        open={!!editingDepartment}
        onOpenChange={() => {
          setEditingDepartment(null)
          setFormData({ name: "", description: "", managerId: "" })
        }}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manager">Department Head</Label>
              <Select value={formData.managerId} onValueChange={(v) => setFormData({ ...formData, managerId: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.status === "active")
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.position}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingDepartment(null)
                setFormData({ name: "", description: "", managerId: "" })
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={handleEditDepartment} className="rounded-xl">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{departmentToDelete?.name}</span>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}
