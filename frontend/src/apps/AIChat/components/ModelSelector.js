import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";

export const MODEL_OPTIONS = [
  { value: "gemini|gemini-2.5-flash",      label: "Gemini 2.5 Flash",      badge: "FAST"    },
  { value: "gemini|gemini-2.5-pro",        label: "Gemini 2.5 Pro",        badge: "SMART"   },
  { value: "gemini|gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", badge: "LITE"    },
  { value: "deepseek|deepseek-chat",       label: "DeepSeek V3",           badge: "V3"      },
];

const BADGE_COLORS = {
  FAST:  { bg: "rgba(0,240,255,0.12)",  border: "rgba(0,240,255,0.35)",  text: "#00F0FF"  },
  SMART: { bg: "rgba(207,158,255,0.12)",border: "rgba(207,158,255,0.35)",text: "#CF9EFF"  },
  LITE:  { bg: "rgba(57,255,20,0.10)",  border: "rgba(57,255,20,0.35)",  text: "#39FF14"  },
  V3:    { bg: "rgba(255,160,0,0.12)",  border: "rgba(255,160,0,0.35)",  text: "#FFA000"  },
};

export function ModelSelect({ value, onChange, disabled }) {
  const current = MODEL_OPTIONS.find((o) => o.value === value) || MODEL_OPTIONS[0];

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        data-testid="model-select"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono outline-none
          border border-white/10 bg-white/[0.04]
          hover:border-[#00F0FF]/35 hover:bg-[#00F0FF]/[0.06]
          focus:border-[#00F0FF]/50 focus:ring-0
          data-[disabled]:opacity-30 data-[disabled]:cursor-not-allowed
          transition-all duration-200 select-none"
        style={{ color: "rgba(255,255,255,0.7)", minWidth: 0 }}
      >
        <SelectPrimitive.Value>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
              {current.label}
            </span>
            {current.badge && (
              <span style={{
                fontSize: 8, fontFamily: "monospace", fontWeight: 700,
                padding: "1px 4px", borderRadius: 3,
                background: BADGE_COLORS[current.badge]?.bg,
                border: `1px solid ${BADGE_COLORS[current.badge]?.border}`,
                color: BADGE_COLORS[current.badge]?.text,
                letterSpacing: "0.08em",
              }}>
                {current.badge}
              </span>
            )}
          </span>
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginLeft: 2 }} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          style={{
            zIndex: 9999,
            minWidth: 210,
            borderRadius: 12,
            background: "rgba(8,10,18,0.96)",
            border: "1px solid rgba(0,240,255,0.18)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,240,255,0.06)",
            overflow: "hidden",
            animation: "selectSlide 0.14s ease",
          }}
        >
          <SelectPrimitive.Viewport style={{ padding: "4px 0" }}>
            {MODEL_OPTIONS.map((opt) => {
              const bc = BADGE_COLORS[opt.badge];
              return (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 14px",
                    cursor: "pointer",
                    outline: "none",
                    transition: "background 0.12s",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.8)",
                    userSelect: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.07)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SelectPrimitive.ItemIndicator>
                      <i className="fa-solid fa-check" style={{ fontSize: 9, color: "#00F0FF", width: 10 }} />
                    </SelectPrimitive.ItemIndicator>
                    <span style={{ minWidth: 10 }}></span>
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  </div>
                  {opt.badge && bc && (
                    <span style={{
                      fontSize: 8, fontFamily: "monospace", fontWeight: 700,
                      padding: "1px 5px", borderRadius: 3,
                      background: bc.bg, border: `1px solid ${bc.border}`, color: bc.text,
                      letterSpacing: "0.08em",
                    }}>
                      {opt.badge}
                    </span>
                  )}
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export default ModelSelect;
