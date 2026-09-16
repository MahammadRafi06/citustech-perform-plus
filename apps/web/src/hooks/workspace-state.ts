"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";

// Drafts stay in this authenticated page session and are cleared at sign-out.
export function useDraft<T>(
  name: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const client = useQueryClient();
  const user = client.getQueryData<{ id: string }>(["session"]);
  const key = ["draft", user?.id, name];
  const { data } = useQuery<T>({
    queryKey: key,
    queryFn: async () => initial,
    initialData: initial,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const set: Dispatch<SetStateAction<T>> = (update) => {
    client.setQueryData<T>(key, (previous) =>
      typeof update === "function"
        ? (update as (v: T) => T)(previous ?? initial)
        : update,
    );
  };
  return [data ?? initial, set];
}

// Native history updates integrate with Next's search params without a server fetch per keystroke.
export function useUrlState<T>(
  name: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const params = useSearchParams();
  const raw = params?.get(name);
  let value = initial;
  if (raw !== null && raw !== undefined) {
    try {
      value = (typeof initial === "string" ? raw : JSON.parse(raw)) as T;
    } catch {}
  }
  const set: Dispatch<SetStateAction<T>> = (update) => {
    const search = new URLSearchParams(window.location.search);
    let current = initial;
    const existing = search.get(name);
    if (existing !== null)
      try {
        current = (
          typeof initial === "string" ? existing : JSON.parse(existing)
        ) as T;
      } catch {}
    const next =
      typeof update === "function" ? (update as (v: T) => T)(current) : update;
    if (JSON.stringify(next) === JSON.stringify(initial)) search.delete(name);
    else
      search.set(name, typeof next === "string" ? next : JSON.stringify(next));
    if (!name.endsWith("page")) search.delete("grid_page");
    const query = search.toString();
    // A no-op history write during route transitions can cancel Next navigation.
    if (query === window.location.search.slice(1)) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? "?" + query : ""}`,
    );
  };
  return [value, set];
}
export function useReturnLink() {
  const path = usePathname() || "/members";
  const params = useSearchParams();
  return (target: string) =>
    `${target}${target.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(path + (params?.toString() ? "?" + params.toString() : ""))}`;
}
export function safeReturn(value: string | null | undefined, fallback: string) {
  return value &&
    /^\/(members|suspects|reviews|qa|campaigns|providers|previsit|chase|intake|submissions|audit|analytics|overview)(\?|$)/.test(
      value,
    )
    ? value
    : fallback;
}
