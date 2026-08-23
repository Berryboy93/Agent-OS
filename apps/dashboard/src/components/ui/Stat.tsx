interface StatProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
}

export function Stat({ label, value, subtext, icon }: StatProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold">
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-muted">
            {subtext}
          </p>
        )}
      </div>
      {icon && (
        <div className="text-accent opacity-50">
          {icon}
        </div>
      )}
    </div>
  )
}
