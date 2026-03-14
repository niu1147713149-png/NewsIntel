"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { buildNumericQueryHref } from "@/lib/analysis-query";

export interface NumericFilterField {
  key: string;
  label: string;
  min: number;
  max: number;
  fallback: number;
}

export interface NumericFilterPreset {
  label: string;
  query: Record<string, number>;
}

export interface NumericFilterSummaryItem {
  label: string;
  value: number | string;
}

interface NumericFilterPanelProps {
  pathname: string;
  currentQuery: Record<string, number>;
  fields: ReadonlyArray<NumericFilterField>;
  presets: ReadonlyArray<NumericFilterPreset>;
  summaryItems: ReadonlyArray<NumericFilterSummaryItem>;
  storageKey: string;
  secondaryLink?: {
    href: string;
    label: string;
  };
}

function toDraft(query: Record<string, number>): Record<string, string> {
  return Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)]));
}

function normalizeQueryValue(value: string | number | undefined, field: NumericFilterField): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    return field.fallback;
  }
  return Math.max(field.min, Math.min(field.max, parsed));
}

function normalizeQuery(
  source: Partial<Record<string, string | number>>,
  fields: ReadonlyArray<NumericFilterField>
): Record<string, number> {
  return Object.fromEntries(
    fields.map((field) => [field.key, normalizeQueryValue(source[field.key], field)])
  );
}

function isSameQuery(left: Record<string, number>, right: Record<string, number>): boolean {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

function readStoredQuery(
  storageKey: string,
  fields: ReadonlyArray<NumericFilterField>
): Record<string, number> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, string | number>>;
    return normalizeQuery(parsed, fields);
  } catch {
    return null;
  }
}

export function NumericFilterPanel({
  pathname,
  currentQuery,
  fields,
  presets,
  summaryItems,
  storageKey,
  secondaryLink
}: NumericFilterPanelProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<Record<string, string>>(() => toDraft(currentQuery));

  useEffect(() => {
    setDraft(toDraft(currentQuery));
  }, [currentQuery]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (searchParams.toString().length === 0) {
      const storedQuery = readStoredQuery(storageKey, fields);
      if (storedQuery && !isSameQuery(storedQuery, currentQuery)) {
        return;
      }
    }

    window.localStorage.setItem(storageKey, JSON.stringify(currentQuery));
  }, [currentQuery, fields, searchParams, storageKey]);

  useEffect(() => {
    if (searchParams.toString().length > 0) {
      return;
    }

    const storedQuery = readStoredQuery(storageKey, fields);
    if (!storedQuery || isSameQuery(storedQuery, currentQuery)) {
      return;
    }

    router.replace(buildNumericQueryHref(pathname, storedQuery), { scroll: false });
  }, [currentQuery, fields, pathname, router, searchParams, storageKey]);

  const activePresetLabel = useMemo(() => {
    const activePreset = presets.find((preset) => isSameQuery(preset.query, currentQuery));
    return activePreset?.label ?? null;
  }, [currentQuery, presets]);

  const handleApply = (): void => {
    const nextQuery = normalizeQuery(draft, fields);
    router.push(buildNumericQueryHref(pathname, nextQuery), { scroll: false });
  };

  const handleReset = (): void => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
    router.push(pathname, { scroll: false });
  };

  return (
    <div className="mt-4 rounded-2xl border border-[#1E293B] bg-[#1A2035]/40 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-[#94A3B8]">
          当前筛选：
          {summaryItems.map((item, index) => (
            <span key={item.label}>
              {index === 0 ? " " : " · "}
              {item.label} {item.value}
            </span>
          ))}
          {activePresetLabel ? <span className="text-[#3B82F6]"> · 预设 {activePresetLabel}</span> : null}
        </p>
        {secondaryLink ? (
          <Link
            href={secondaryLink.href}
              className="button-secondary rounded-xl px-4 py-2 text-sm"
            >
              {secondaryLink.label}
            </Link>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const isActive = preset.label === activePresetLabel;
          return (
            <Link
              key={preset.label}
              href={buildNumericQueryHref(pathname, preset.query)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-[#3B82F6] bg-[#3B82F620] text-[#BFDBFE] shadow-[0_10px_24px_rgba(59,130,246,0.16)]"
                  : "border-[#1E293B] bg-[#1A2035] text-[#F1F5F9] hover:border-[#334155]"
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {fields.map((field) => (
          <label key={field.key} className="space-y-1.5 text-xs text-[#94A3B8]">
            <span>{field.label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={field.min}
              max={field.max}
              step={1}
              value={draft[field.key] ?? String(field.fallback)}
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  [field.key]: nextValue
                }));
              }}
              className="input-surface w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-[#475569]"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleApply}
          className="button-primary rounded-xl px-4 py-2 text-sm font-medium"
        >
          应用筛选
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="button-secondary rounded-xl px-4 py-2 text-sm"
        >
          清除筛选
        </button>
      </div>
    </div>
  );
}
