import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ToolButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "sm" | "md";
};

export const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(
  function ToolButton({ children, className = "", size = "md", type = "button", ...rest }, ref) {
    const sizeClass = size === "sm" ? "text-xs px-2" : "";
    return (
      <button
        ref={ref}
        type={type}
        className={`os-tool-btn ${sizeClass} ${className}`.trim()}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
