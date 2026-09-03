/** Section 8: a skeleton of 5 rows, held for the fixed delay inside `loadTickets`. */
export function LoadingSkeleton() {
  return (
    <div data-testid="loading-skeleton" role="status" aria-label="Loading tickets">
      <table>
        <caption className="visually-hidden">Support tickets, loading</caption>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className="skeleton-row">
              <td colSpan={7}>
                <span className="skeleton-bar" aria-hidden="true" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
