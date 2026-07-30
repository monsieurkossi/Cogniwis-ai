import { OniAvatar } from "./OniAvatar";

interface Props {
  content: string;
  streaming?: boolean;
}

export function OniMessage({ content, streaming = false }: Props) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 mt-1">
        <OniAvatar size={32} speaking={streaming} />
      </div>
      <div className="max-w-[calc(100%-3rem)]">
        <div className="text-xs text-gray-500 mb-1 font-medium">Oni</div>
        <div className="bg-surface-1 border border-gray-200 rounded-card shadow-card px-4 py-3 text-gray-900 whitespace-pre-wrap leading-relaxed">
          {content}
          {streaming && !content && (
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
          )}
          {streaming && content && (
            <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 align-middle animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
