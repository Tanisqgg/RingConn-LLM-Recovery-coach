import React from 'react';

interface AppleCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AppleCard({ children, className = '' }: AppleCardProps) {
  return (
    <div className={`bg-dark-card rounded-2xl border border-dark-border backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}