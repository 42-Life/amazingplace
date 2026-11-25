// FETCH ALL ROWS
// Supabase sends back at most 1000 rows per request (max_rows in supabase/config.toml),
// and stops there without any error. A count or total built from one request would then
// quietly come out wrong. This asks for one page at a time until a page comes back short.

// Must not be bigger than max_rows, or a full page would look short and end the loop early
const PAGE_SIZE = 1000;

// `page` builds the query for rows `from` to `to` (both included), usually by ending with .range(from, to).
// The query needs a stable order (e.g. created_at then id), or rows can repeat or go missing between pages.
export async function fetchAllRows<T>(
    page: (from: number, to: number) => PromiseLike<{data: T[] | null; error: unknown}>,
): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const {data, error} = await page(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) return rows;
    }
}
