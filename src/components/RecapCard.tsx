"use client";

interface Props {
  recap: string;
  onConfirm: () => void;
  onEdit: () => void;
  loading?: boolean;
}

export function RecapCard({ recap, onConfirm, onEdit, loading = false }: Props) {
  return (
    <div className="bg-surface-1 border border-accent/40 rounded-card p-5 shadow-card">
      <div className="text-xs uppercase tracking-wide text-accent-dark font-semibold mb-2">
        Récap avant diagnostic
      </div>
      <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
        {recap}
      </div>
      <div className="flex items-center gap-2 mt-4 justify-end">
        <button
          type="button"
          onClick={onEdit}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-card border border-gray-200 text-gray-700 hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          Je corrige
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-card bg-accent text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {loading ? "…" : "C'est exact → diagnostic"}
        </button>
      </div>
    </div>
  );
}
