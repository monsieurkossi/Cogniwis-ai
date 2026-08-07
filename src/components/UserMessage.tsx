interface Props {
  content: string;
}

export function UserMessage({ content }: Props) {
  return (
    <div className="flex justify-end">
      <div className="bubble-user max-w-[78%] text-gray-900 rounded-[20px] rounded-br-md px-4 py-2.5 whitespace-pre-wrap leading-[1.6] text-[15px]">
        {content}
      </div>
    </div>
  );
}
