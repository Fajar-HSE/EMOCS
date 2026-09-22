import Link from "next/link"
import { requireAuth } from "@/lib/auth/session"
import { visibleMasterTabs, masterSectionHeading } from "@/lib/auth/navigation"

export default async function MasterDataLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth()
  const tabs = visibleMasterTabs(ctx.roles)
  const heading = masterSectionHeading(ctx.roles)

  return (
    <div className="flex flex-col gap-4 p-6">
      {heading && <h1 className="text-xl font-semibold">{heading}</h1>}
      {tabs.length > 1 && (
        <div className="flex gap-4 border-b">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="text-muted-foreground hover:text-foreground pb-2 text-sm"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
