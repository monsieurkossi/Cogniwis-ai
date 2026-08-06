interface Props {
  content: string;
}

export function UserMessage({ content }: Props) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] bg-surface-2 text-gray-900 rounded-[22px] rounded-br-md px-4 py-2.5 whitespace-pre-wrap leading-relaxed text-[15px] border border-gray-200/60">
        {content}
      </div>
    </div>
  );
}
