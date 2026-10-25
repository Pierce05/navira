'use client';
import Link from 'next/link';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const base = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full px-5 py-2 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-accent-strong text-on-accent hover:opacity-90',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface2',
  ghost: 'text-accent-strong underline underline-offset-4 hover:opacity-80',
  danger: 'border-2 border-danger bg-surface text-danger hover:bg-surface2',
};

export function Button({ variant = 'primary', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...p} className={`${base} ${variants[variant]} ${className}`} />;
}
export function LinkButton({ href, variant = 'primary', className = '', children, ...p }: { href: string; variant?: Variant; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const external = /^(tel:|mailto:|https?:)/.test(href);
  const cls = `${base} ${variants[variant]} ${className}`;
  return external ? <a href={href} className={cls} {...p}>{children}</a> : <Link href={href} className={cls} {...p}>{children}</Link>;
}
export function Card({ className = '', ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div {...p} className={`card p-5 sm:p-7 ${className}`} />; }
export function Badge({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'patient' | 'system' | 'warn' }) {
  const t = { plain: 'border-line text-muted', patient: 'border-line text-ink', system: 'border-dashed border-accent-strong text-accent-strong', warn: 'border-danger text-danger' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px] ${t}`}>{children}</span>;
}
export function PageTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="mb-8 max-w-2xl">
      <h1 className="text-3xl sm:text-5xl">{title}</h1>
      {intro ? <p className="mt-3 text-lg text-muted">{intro}</p> : null}
    </header>
  );
}
/** Organic divider, decorative only. */
export function Blob({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 40" preserveAspectRatio="none" className={`h-6 w-full ${className}`}>
      <path d="M0 24 C 150 4, 300 36, 450 20 S 750 4, 900 22 S 1100 34, 1200 16 L1200 40 L0 40 Z" fill="var(--blush)" opacity="0.55" />
    </svg>
  );
}
export const Empty = ({ text }: { text: string }) => <p className="rounded-2xl border border-dashed border-line p-6 text-muted">{text}</p>;
