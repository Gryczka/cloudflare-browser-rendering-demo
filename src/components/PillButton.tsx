interface PillButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
}

export default function PillButton({
  label,
  onClick,
  active,
}: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn-preset ${
        active
          ? 'border-cf-orange border-dashed text-cf-text'
          : ''
      }`}
    >
      {label}
    </button>
  );
}
