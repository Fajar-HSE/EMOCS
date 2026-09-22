import Link from "next/link"

const tabs = [
  { href: "/master/customers", label: "Customer" },
  { href: "/master/trainings", label: "Training/Program" },
  { href: "/master/cities", label: "Kota" },
  { href: "/master/trainers", label: "Trainer" },
  { href: "/master/venues", label: "Venue" },
  { href: "/master/equipment", label: "Equipment" },
  { href: "/master/checklist-templates", label: "Template Checklist" },
  { href: "/master/task-templates", label: "Template Task" },
  { href: "/master/cost-categories", label: "Kategori Biaya" },
  { href: "/master/vendors", label: "Vendor" },
  { href: "/master/approval-thresholds", label: "Approval Threshold" },
]

export default function MasterDataLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Master Data</h1>
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
      {children}
    </div>
  )
}
