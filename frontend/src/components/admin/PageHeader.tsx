import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
    <div>
      {eyebrow && (
        <span className="font-admin-mono text-[10px] font-semibold tracking-[0.14em] uppercase text-admin-text-faint">
          {eyebrow}
        </span>
      )}
      <h1 className="font-admin-display text-2xl font-bold text-admin-text mt-0.5">{title}</h1>
      {description && (
        <p className="font-admin-body text-xs text-admin-text-muted font-medium mt-1 max-w-xl">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
