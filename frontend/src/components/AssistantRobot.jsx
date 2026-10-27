import { Bot } from "lucide-react";

export function AssistantRobot({ size = "md" }) {
  const glyph = size === "lg" ? 16 : size === "sm" ? 0 : 12;
  return (
    <span className={`assistant-robot assistant-robot--${size}`} aria-hidden="true">
      <span className="assistant-robot__antenna" />
      <span className="assistant-robot__head">
        <span className="assistant-robot__eye" />
        <span className="assistant-robot__eye" />
        {glyph ? <Bot size={glyph} className="assistant-robot__glyph" /> : null}
      </span>
    </span>
  );
}
