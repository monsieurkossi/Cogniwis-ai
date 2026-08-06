import { OniAvatar } from "./OniAvatar";

interface Props {
  content: string;
  streaming?: boolean;
}

export function OniMessage({ content, streaming = false }: Props) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 mt-0.5">
        <OniAvatar size={28} speaking={streaming} />
      </div>
      <div className="max-w-[calc(100%-3rem)] flex-1 min-w-0">
        <div className="text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">
          Oni · conseiller
        </div>
        <div className="text-gray-900 whitespace-pre-wrap leading-[1.65] text-[15px]">
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
