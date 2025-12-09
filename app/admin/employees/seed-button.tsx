"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { seedMockEmployeeAccounts, getMockEmployeeCredentials } from "./seed-accounts"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Users, Loader2, CheckCircle, XCircle, Copy } from "lucide-react"

export function SeedEmployeesButton() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [results, setResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string; name: string }[] | null>(null)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const seedResults = await seedMockEmployeeAccounts()
      setResults(seedResults)
      const creds = await getMockEmployeeCredentials()
      setCredentials(creds)

      const successCount = seedResults.filter((r) => r.success).length
      toast({
        title: "Seeding Complete",
        description: `${successCount}/${seedResults.length} employee accounts created/updated successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed employee accounts",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Credentials copied to clipboard",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Seed Test Accounts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seed Mock Employee Accounts</DialogTitle>
          <DialogDescription>
            Create test employee accounts that can login from any device. Default password:{" "}
            <code className="bg-muted px-1 rounded">hcdc2024</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results && (
            <Button onClick={handleSeed} disabled={isSeeding} className="w-full">
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Accounts...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create 6 Test Employee Accounts
                </>
              )}
            </Button>
          )}

          {results && (
            <div className="space-y-2">
              <h4 className="font-medium">Results:</h4>
              <div className="space-y-1">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      result.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {result.email}
                    </span>
                    {result.error && <span className="text-xs">{result.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {credentials && (
            <div className="space-y-2">
              <h4 className="font-medium">Login Credentials:</h4>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                {credentials.map((cred, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{cred.name}</span>
                      <br />
                      <span className="text-muted-foreground">{cred.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`Email: ${cred.email}\nPassword: ${cred.password}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="pt-2 border-t mt-2">
                  <span className="text-muted-foreground text-xs">
                    Password for all accounts: <code className="bg-background px-1 rounded">hcdc2024</code>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
