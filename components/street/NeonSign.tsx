export function NeonSign({ text, color }: { text: string; color: string }) {
  return (
    <p
      className="rounded-sm border border-edge bg-sign px-4 py-2 text-center font-display text-xl font-bold tracking-wide md:text-3xl"
      style={{ color, textShadow: `0 0 14px ${color}80` }}
    >
      {text}
    </p>
  );
}
