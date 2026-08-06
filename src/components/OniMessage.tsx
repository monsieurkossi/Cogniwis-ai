interface Props {
  content: string;
  streaming?: boolean;
}

export function OniMessage({ content, streaming = false }: Props) {
  return (
    <div className="w-full">
      <div className="text-gray-900 whitespace-pre-wrap leading-[1.7] text-[15.5px] max-w-[85%]">
        {content}
        {streaming && !content && (
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        )}
        {streaming && content && (
          <span className="inline-block w-[3px] h-[18px] bg-gray-900 ml-0.5 align-middle animate-pulse rounded-full" />
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <MessageAction label="Copier">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </MessageAction>
        <MessageAction label="Utile">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10Zm0 0V4a2 2 0 0 1 4 0v.88" />
          </svg>
        </MessageAction>
        <MessageAction label="Pas utile">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 14V2" />
            <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12Zm0 0v6a2 2 0 0 1-4 0v-.88" />
          </svg>
        </MessageAction>
      </div>
    </div>
  );
}

function MessageAction({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-surface-2 transition-colors"
    >
      {children}
    </button>
  );
}
