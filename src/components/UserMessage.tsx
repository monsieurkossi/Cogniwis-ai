interface Props {
  content: string;
}

export function UserMessage({ content }: Props) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-accent text-white rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap leading-relaxed text-[15px] shadow-card">
        {content}
      </div>
    </div>
  );
}
