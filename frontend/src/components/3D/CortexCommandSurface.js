import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * CortexCommandSurface — Luxury Precision Command Surface for OmniverseOS 2.0.
 * Dark optical glass panel enabling interactive workspace intelligence activation.
 */
export function CortexCommandSurface({ onExecutePrompt }) {
  const [promptText, setPromptText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState(null);

  const SUGGESTED_PROMPTS = [
    {
      text: "Prepare my workspace for tomorrow",
      apps: ["calendar", "tasks", "projects", "memory", "notes"],
      msg: "WORKSPACE PREPARED • Calendar, Tasks & Projects synchronized into Memory"
    },
    {
      text: "Find the decision I made about this project",
      apps: ["memory", "notes", "projects", "timeline"],
      msg: "CONTEXT LOCATED • Decision lattice retrieved from Memory & Timeline"
    },
    {
      text: "Show me everything related to Project X",
      apps: ["projects", "files", "timeline", "code"],
      msg: "CONSTELLATION ACTIVATED • 14 artifacts linked across Projects & Code"
    },
    {
      text: "Synthesize intelligence report",
      apps: ["blackbox", "warroom", "adversary", "matrix"],
      msg: "INTELLIGENCE SYNTHESIZED • Strategic War Room matrix active"
    }
  ];

  const handleSelectPrompt = (promptObj) => {
    setPromptText(promptObj.text);
    runPrompt(promptObj);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    const matched = SUGGESTED_PROMPTS.find(p => p.text.toLowerCase().includes(promptText.toLowerCase())) || {
      text: promptText,
      apps: ["voice", "chat", "memory", "tasks"],
      msg: `CORTEX REASONING • Execution sequence active for "${promptText}"`
    };

    runPrompt(matched);
  };

  const runPrompt = (promptObj) => {
    setIsExecuting(true);
    setExecutionMessage(null);

    if (onExecutePrompt) {
      onExecutePrompt(promptObj.apps);
    }

    setTimeout(() => {
      setIsExecuting(false);
      setExecutionMessage(promptObj.msg);
    }, 1100);
  };

  return (
    <div className="cortex-command-surface-container" style={{
      position: 'relative',
      maxWidth: '680px',
      margin: '0 auto',
      width: '100%',
      zIndex: 20
    }}>
      <form 
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(6, 15, 33, 0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderRadius: '16px',
          padding: '12px 18px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 240, 255, 0.12)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
        }}
      >
        <Sparkles className="w-5 h-5" style={{ color: '#00F0FF', flexShrink: 0 }} />

        <input 
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Tell Cortex what you're trying to accomplish..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#FFFFFF',
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.01em'
          }}
        />

        <button 
          type="submit"
          disabled={isExecuting}
          style={{
            background: 'linear-gradient(135deg, #00F0FF 0%, #7B2FFF 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 18px',
            color: '#030712',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s ease, opacity 0.2s ease'
          }}
        >
          {isExecuting ? (
            <span>Processing...</span>
          ) : (
            <>
              <span>Execute</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Suggested Prompts Pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '12px',
        justifyContent: 'center'
      }}>
        {SUGGESTED_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectPrompt(p)}
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '6px 14px',
              color: '#94A3B8',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
              e.currentTarget.style.color = '#00F0FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            "{p.text}"
          </button>
        ))}
      </div>

      {/* Execution Feedback Toast */}
      {executionMessage && (
        <div style={{
          marginTop: '12px',
          background: 'rgba(5, 46, 22, 0.9)',
          border: '1px solid rgba(57, 255, 20, 0.35)',
          borderRadius: '12px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#39FF14',
          fontSize: '13px',
          fontWeight: '500',
          animation: 'fadeIn 0.3s ease'
        }}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{executionMessage}</span>
        </div>
      )}
    </div>
  );
}
