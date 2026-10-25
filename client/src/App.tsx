/**
 * client/src/App.tsx
 *
 * Root component — placeholder until Phase 4 frontend implementation.
 * The full UI (auth, dashboard, vehicle cards, admin modals) will be
 * built here following the backend TDD phases.
 */
export default function App() {
  return (
    <div className="min-h-screen bg-dealer-surface flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚗</div>
        <h1 className="text-3xl font-bold text-dealer-dark mb-2">AutoDealer</h1>
        <p className="text-dealer-muted text-lg">Car Dealership Inventory System</p>
        <p className="text-sm text-dealer-muted mt-4 opacity-60">
          Frontend implementation coming in Phase 4
        </p>
      </div>
    </div>
  );
}
