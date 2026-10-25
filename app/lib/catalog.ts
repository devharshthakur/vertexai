/** Client-side state for the catalog filters shared by the page and its form. */
export interface CatalogFilterState {
  q: string
  category: string
  difficulty: string
  page: number
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  q: '',
  category: '',
  difficulty: '',
  page: 1
}

/** Page size for the catalog endpoint. */
export const CATALOG_PAGE_SIZE = 12
