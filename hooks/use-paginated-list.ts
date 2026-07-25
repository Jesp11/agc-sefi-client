"use client";

import { useMemo, useState } from "react";

export const PAGE_SIZE = 10;

export function filterBySearch<T>(
  items: T[],
  search: string,
  getFields: (item: T) => (string | number | null | undefined)[]
): T[] {
  const term = search.toLowerCase().trim();
  if (!term) return items;
  return items.filter((item) =>
    getFields(item).some((field) => String(field ?? "").toLowerCase().includes(term))
  );
}

export function paginateItems<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return items.slice((safePage - 1) * pageSize, safePage * pageSize);
}

export function useTableControls() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return { search, setSearch, handleSearch, page, setPage };
}

export function useFilteredPagination<T>(
  items: T[],
  search: string,
  page: number,
  getFields: (item: T) => (string | number | null | undefined)[]
) {
  const filtered = useMemo(
    () => filterBySearch(items, search, getFields),
    [items, search, getFields]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(
    () => paginateItems(filtered, safePage),
    [filtered, safePage]
  );

  return { filtered, paginated, safePage, totalPages };
}
