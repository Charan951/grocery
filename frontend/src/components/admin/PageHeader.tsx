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
        <span className="admin-label block">{eyebrow}</span>
      )}
      <h1 className="admin-h1 mt-1">{title}</h1>
      {description && (
        <p className="font-admin-body text-[13px] leading-relaxed text-admin-text-muted mt-1.5 max-w-[68ch]">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
