---
name: tanstack-table
description: Headless table with sorting, filtering, pagination, and row selection using TanStack Table. Use when building data tables in React apps.
---

# TanStack Table

Headless table logic — you own the markup, TanStack Table owns the state and calculations.

## Setup (CRITICAL)

```typescript
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
```

## Column Definitions (CRITICAL)

```typescript
type Post = { id: string; title: string; author: string; status: 'draft' | 'published'; createdAt: Date }

const columns: ColumnDef<Post>[] = [
  // Selection column
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    enableSorting: false,
  },
  // Data columns
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => <strong>{row.getValue('title')}</strong>,
  },
  {
    accessorKey: 'author',
    header: ({ column }) => (
      <button onClick={() => column.toggleSorting()}>
        Author {column.getIsSorted() === 'asc' ? '↑' : column.getIsSorted() === 'desc' ? '↓' : '↕'}
      </button>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <span className={`badge badge-${getValue<string>()}`}>{getValue<string>()}</span>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ getValue }) => getValue<Date>().toLocaleDateString(),
    sortingFn: 'datetime',
  },
  // Actions column
  {
    id: 'actions',
    cell: ({ row }) => <PostActions post={row.original} />,
    enableSorting: false,
  },
]
```

## Table Instance (CRITICAL)

```typescript
function PostsTable({ data }: { data: Post[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div>
      <TableToolbar table={table} globalFilter={globalFilter} onGlobalFilterChange={setGlobalFilter} />
      <TableBody table={table} />
      <TablePagination table={table} />
      {Object.keys(rowSelection).length > 0 && (
        <BulkActions selectedRows={table.getSelectedRowModel().rows.map(r => r.original)} />
      )}
    </div>
  )
}
```

## Rendering (HIGH)

```typescript
function TableBody<T>({ table }: { table: Table<T> }) {
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder ? null : flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id} data-selected={row.getIsSelected()}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
        {table.getRowModel().rows.length === 0 && (
          <tr><td colSpan={columns.length}>No results</td></tr>
        )}
      </tbody>
    </table>
  )
}
```

## Pagination (HIGH)

```typescript
function TablePagination<T>({ table }: { table: Table<T> }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>«</button>
      <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>‹</button>
      <span>
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
      </span>
      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>›</button>
      <button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>»</button>
      <select
        value={table.getState().pagination.pageSize}
        onChange={e => table.setPageSize(Number(e.target.value))}
      >
        {[10, 20, 50, 100].map(size => (
          <option key={size} value={size}>Show {size}</option>
        ))}
      </select>
      <span>{table.getFilteredRowModel().rows.length} total rows</span>
    </div>
  )
}
```

## Server-Side Data (MEDIUM)

For large datasets, move sorting/filtering/pagination to the server:

```typescript
function PostsTable() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const { data } = useQuery({
    queryKey: ['posts', 'list', { sorting, pagination }],
    queryFn: () => fetchPosts({
      sortBy: sorting[0]?.id,
      sortDir: sorting[0]?.desc ? 'desc' : 'asc',
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
    }),
    placeholderData: keepPreviousData,
  })

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    rowCount: data?.total,  // Tell table total count for pagination
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,     // Don't sort client-side
    manualPagination: true,  // Don't paginate client-side
  })
}
```

## Column Visibility (MEDIUM)

```typescript
const [columnVisibility, setColumnVisibility] = useState({})

const table = useReactTable({
  // ...
  state: { columnVisibility },
  onColumnVisibilityChange: setColumnVisibility,
})

// Column toggle UI
{table.getAllColumns()
  .filter(col => col.getCanHide())
  .map(col => (
    <label key={col.id}>
      <input
        type="checkbox"
        checked={col.getIsVisible()}
        onChange={col.getToggleVisibilityHandler()}
      />
      {col.id}
    </label>
  ))
}
```

## Common Mistakes

- **Don't recreate `columns` on every render** — define outside component or use `useMemo`
- **Don't use `data` directly from API without memoization** — causes infinite re-renders
- **Don't mix client-side and server-side modes** — pick one per table
- **Don't forget `rowCount` for server-side pagination** — table can't calculate page count without it
