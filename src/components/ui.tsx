"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose, IconAlert, IconCheck } from "./icons";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  extraWide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  extraWide?: boolean;
}) {
  // On ne peut appeler document.body qu'une fois monté côté client (SSR-safe).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`ef-card flex max-h-[95vh] w-full flex-col ${extraWide ? "max-w-6xl" : wide ? "max-w-4xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-2.5">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );

  // Portal : rendu directement dans <body>, hors de tout ancêtre animé (.ef-fade)
  // qui casserait le positionnement "fixed" du modal (bug des containing blocks CSS).
  return createPortal(modal, document.body);
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50 py-14 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition ${
            active === tab.key ? "text-[#b56a00]" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab.label}
          {active === tab.key && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#f5a623]" />
          )}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
        checked ? "bg-[#22a35a]" : "bg-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export type ToastMessage = { type: "success" | "error"; text: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  return { toast, showToast: setToast };
}

export function ToastViewport({ toast }: { toast: ToastMessage }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!toast || !mounted) return null;

  const isError = toast.type === "error";
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        className={`ef-fade pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${
          isError ? "bg-red-600" : "bg-slate-900"
        }`}
      >
        {isError ? <IconAlert className="h-4 w-4" /> : <IconCheck className="h-4 w-4" />}
        {toast.text}
      </div>
    </div>,
    document.body,
  );
}