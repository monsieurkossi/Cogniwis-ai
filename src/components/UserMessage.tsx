interface Props {
  content: string;
}

export function UserMessage({ content }: Props) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-accent-light text-accent-dark border border-accent/20 rounded-card px-4 py-3 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}
