import React, { useState } from 'react';
import { Sparkles, Terminal, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * CortexCommandSurface — Interactive Command Bar inside the 3D Omniverse environment.
 * Demonstrates real Cortex workspace intelligence activation across applications.
 */
export function CortexCommandSurface({ onExecutePrompt, activeApps = [] }) {
  const [promptText, setPromptText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState(null);

  const SUGGESTED_PROMPTS = [
    {
      text: "Prepare my workspace for tomorrow",
      apps: ["calendar", "tasks", "projects", "memory", "notes"],
      msg: "WORKSPACE READY • Calendar, Tasks & Projects synchronized into memory"
    },
    {
      text: "Find the decision I made about this project",
      apps: ["memory", "notes", "projects", "timeline"],
      msg: "CONTEXT RETRIEVED • Decision lattice located in Memory & Project timeline"
    },
    {
      text: "Show me everything related to Project X",
      apps: ["projects", "files", "timeline", "code"],
      msg: "CONSTELLATION ACTIVATED • 14 items across Projects, Files & Code linked"
    },
    {
      text: "Synthesize intelligence report",
      apps: ["blackbox", "warroom", "adversary", "matrix"],
      msg: "INTELLIGENCE SYNTHESIZED • Strategic War Room analysis active"
    }
  ];

  const handleSelectPrompt = (promptObj) => {
    setPromptText(promptObj.text);
    runPrompt(promptObj);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    
    // Find matching suggested prompt or default
    const matched = SUGGESTED_PROMPTS.find(p => p.text.toLowerCase().includes(promptText.toLowerCase())) || {
      text: promptText,
      apps: ["voice", "chat", "memory", "tasks"],
      msg: `CORTEX REASONING • Active execution for "${promptText}"`
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
    }, 1200);
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
          background: 'rgba(8, 18, 38, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '10px 16px',
          boxShadow: '0 8px 32px rgba(0, 240, 255, 0.15)',
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
            fontSize: '15px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        />

        <button 
          type="submit"
          disabled={isExecuting}
          style={{
            background: 'linear-gradient(135deg, #00F0FF 0%, #7B2FFF 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            color: '#030712',
            fontWeight: '600',
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
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '6px 14px',
              color: '#94A3B8',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
              e.currentTarget.style.color = '#00F0FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
          background: 'rgba(5, 46, 22, 0.85)',
          border: '1px solid rgba(57, 255, 20, 0.4)',
          borderRadius: '12px',
          padding: '8px 14px',
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
