type LogoFillProps = {
  size?: number;
  /** `once` preenche e para; `loop` repete enquanto a tela de loading estiver visível. */
  mode?: "once" | "loop";
};

export function LogoFill({ size = 176, mode = "loop" }: LogoFillProps) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Carregando"
    >
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain opacity-[0.16]"
        draggable={false}
      />
      <div
        className={
          mode === "once" ? "absolute inset-0 animate-logo-fill-once" : "absolute inset-0 animate-logo-fill"
        }
      >
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
