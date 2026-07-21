import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Cpu,
  Workflow,
  BrainCircuit,
  Rocket,
  ShieldCheck,
  Box,
  Wand2,
  Layers3,
  TerminalSquare,
  Activity,
  Zap,
} from 'lucide-react';

const modules = [
  {
    id: 'agent-core',
    title: 'Agent Core',
    icon: BrainCircuit,
    accent: 'from-cyan-400/80 via-sky-400/40 to-transparent',
    glow: 'shadow-[0_0_32px_rgba(34,211,238,0.18)]',
    description:
      'Autonomous orchestration, memory routing, and adaptive tool execution for every Omniverse workflow.',
    tags: ['Autonomous', 'Memory Mesh', 'Multi-Tool'],
  },
  {
    id: 'omniforge',
    title: 'OmniForge',
    icon: Wand2,
    accent: 'from-fuchsia-400/80 via-pink-400/40 to-transparent',
    glow: 'shadow-[0_0_32px_rgba(232,121,249,0.18)]',
    description:
      'Generates polished apps, widgets, and system surfaces with Apple 3038 precision and cyberpunk restraint.',
    tags: ['UI Synthesis', 'Glass FX', 'Rapid Build'],
  },
  {
    id: 'runtime',
    title: 'Runtime Fabric',
    icon: Cpu,
    accent: 'from-emerald-400/70 via-teal-400/30 to-transparent',
    glow: 'shadow-[0_0_32px_rgba(52,211,153,0.18)]',
    description:
      'Executes containerized logic, service bindings, and real-time state transitions across the OS shell.',
    tags: ['Live State', 'Realtime', 'Execution'],
  },
  {
    id: 'security',
    title: 'Zero-Trust Shield',
    icon: ShieldCheck,
    accent: 'from-violet-400/70 via-indigo-400/30 to-transparent',
    glow: 'shadow-[0_0_32px_rgba(167,139,250,0.18)]',
    description:
      'Permission boundaries, audit trails, and resilient policy gates for secure modular expansion.',
    tags: ['Audit', 'Policy', 'Isolation'],
  },
];

const stats = [
  { label: 'System Harmony', value: '99.98%', icon: Activity },
  { label: 'Forge Velocity', value: '12x', icon: Rocket },
  { label: 'Active Modules', value: '128', icon: Box },
  { label: 'Signal Flux', value: 'Realtime', icon: Zap },
];

const commandStream = [
  'Bootstrapping Omniverse kernel surface...',
  'Syncing agent memory lattice...',
  'Mounting widget intelligence fabric...',
  'Activating adaptive orchestration layer...',
  'OmniForge standing by.',
];

const chipStyles = [
  'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
  'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100',
  'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  'border-violet-400/20 bg-violet-400/10 text-violet-100',
];

function OmniForgeWidget() {
  const [selected, setSelected] = useState(modules[1]?.id || modules[0].id);

  const activeModule = useMemo(
    () => modules.find((item) => item.id === selected) || modules[0],
    [selected]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#050816]/85 text-white backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))]" />
      <div className="absolute inset-[1px] rounded-[27px] border border-white/10" />
      <div className="absolute -left-20 top-16 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col gap-5 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              OmniForge Interface
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Apple 3038 command surface
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/64 md:text-[15px]">
                A deep-glass operational widget for orchestrating agents, building apps,
                and monitoring the Omniverse runtime with ultra-minimal cybernetic focus.
              </p>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-xl md:block">
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">
              Core status
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.9)]" />
              Online
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent opacity-70" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      {item.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-white">
                      {item.value}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-cyan-200 transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-h-0 flex-col rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
                  Module lattice
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Operational domains</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55">
                <Workflow className="h-3.5 w-3.5 text-cyan-300" />
                Click to focus
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {modules.map((module, index) => {
                const Icon = module.icon;
                const isActive = activeModule.id === module.id;
                return (
                  <motion.button
                    key={module.id}
                    type="button"
                    onClick={() => setSelected(module.id)}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 + index * 0.08 }}
                    className={[
                      'group relative overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-300',
                      isActive
                        ? 'border-cyan-300/30 bg-white/[0.09] shadow-[0_0_40px_rgba(34,211,238,0.18)]'
                        : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.accent} opacity-30`} />
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className={`rounded-2xl border border-white/10 bg-black/20 p-3 text-white ${module.glow}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <Layers3 className="h-4 w-4 text-white/30 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </div>

                      <div>
                        <h4 className="text-base font-semibold tracking-tight text-white">
                          {module.title}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-white/62">
                          {module.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {module.tags.map((tag, tagIndex) => (
                          <span
                            key={tag}
                            className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${chipStyles[tagIndex % chipStyles.length]}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="grid min-h-0 gap-5">
            <motion.div
              key={activeModule.id}
              initial={{ opacity: 0, scale: 0.98, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${activeModule.accent} opacity-25`} />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
                      Focused context
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                      {activeModule.title}
                    </h3>
                  </div>
                  <div className={`rounded-2xl border border-white/10 bg-black/20 p-3 ${activeModule.glow}`}>
                    <activeModule.icon className="h-5 w-5 text-white" />
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-white/68">
                  {activeModule.description} This pane can be used for command routing,
                  state introspection, feature synthesis, or AI-native system diagnostics.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {activeModule.tags.map((tag) => (
                    <div
                      key={tag}
                      className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-center text-xs uppercase tracking-[0.2em] text-white/72"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="rounded-[26px] border border-white/10 bg-[#060a19]/80 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
                    Signal stream
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Live command output</h3>
                </div>
                <TerminalSquare className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 space-y-2 rounded-[22px] border border-white/8 bg-black/30 p-4 font-mono text-[12px] leading-6 text-cyan-100/90">
                {commandStream.map((line, index) => (
                  <motion.div
                    key={line}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 + index * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
                    <span className="text-white/74">{line}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-1">
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-white/38">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Deep Glass
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Cybernetic Focus
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Modular Intelligence
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
            <Rocket className="h-3.5 w-3.5" />
            Ready to deploy
          </div>
        </div>
      </div>
    </div>
  );
}

export default OmniForgeWidget;
