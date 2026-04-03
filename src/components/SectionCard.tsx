interface SectionCardProps {
  title: string;
  label?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const SectionCard = ({ title, label, children, className = "", noPadding = false }: SectionCardProps) => (
  <div className={`bg-card rounded-lg border border-border shadow-sm overflow-hidden ${className}`}>
    <div className="section-header">
      <h3 className="text-lg font-medium text-foreground font-display">{title}</h3>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</span>
      )}
    </div>
    <div className={noPadding ? "" : "px-6 py-6"}>{children}</div>
  </div>
);

export default SectionCard;
