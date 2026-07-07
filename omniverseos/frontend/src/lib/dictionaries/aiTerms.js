/**
 * aiTerms.js — AI Models & Provider Dictionary
 * OmniverseOS Speech Correction Engine
 *
 * Applied in all technical contexts to correct AI/ML model and provider names.
 * Each entry: [rawPattern, correctedForm]
 * Patterns matched case-insensitively at word boundaries.
 */

export const DICT_AI = [
  // OpenAI
  ["open a i",             "OpenAI"],
  ["open ai",              "OpenAI"],
  ["openai",               "OpenAI"],
  ["chat gpt",             "ChatGPT"],
  ["chat g p t",           "ChatGPT"],
  ["gpt 4",                "GPT-4"],
  ["gpt 4 o",              "GPT-4o"],
  ["gpt 4 oh",             "GPT-4o"],
  ["gpt 3",                "GPT-3"],
  ["gpt 3.5",              "GPT-3.5"],
  ["o3",                   "o3"],
  ["o4",                   "o4"],
  ["whisper",              "Whisper"],
  ["dall e",               "DALL-E"],
  ["dalle",                "DALL-E"],
  ["sora",                 "Sora"],

  // Anthropic
  ["claud",                "Claude"],
  ["claude",               "Claude"],
  ["claude 3",             "Claude 3"],
  ["claude 4",             "Claude 4"],
  ["anthropic",            "Anthropic"],
  ["claude sonnet",        "Claude Sonnet"],
  ["claude haiku",         "Claude Haiku"],
  ["claude opus",          "Claude Opus"],

  // Google
  ["gem any",              "Gemini"],
  ["gem ini",              "Gemini"],
  ["gemini",               "Gemini"],
  ["gem any flash",        "Gemini Flash"],
  ["gem any pro",          "Gemini Pro"],
  ["gemini flash",         "Gemini Flash"],
  ["gemini pro",           "Gemini Pro"],
  ["gemini ultra",         "Gemini Ultra"],
  ["google ai",            "Google AI"],
  ["google deep mind",     "Google DeepMind"],
  ["deepmind",             "DeepMind"],
  ["deep mind",            "DeepMind"],
  ["palm",                 "PaLM"],
  ["bard",                 "Bard"],

  // Meta
  ["llama",                "Llama"],
  ["llama 2",              "Llama 2"],
  ["llama 3",              "Llama 3"],
  ["meta ai",              "Meta AI"],

  // Mistral
  ["mistral",              "Mistral"],
  ["mistral 7b",           "Mistral 7B"],
  ["mixtral",              "Mixtral"],
  ["mix tral",             "Mixtral"],

  // Other frontier labs
  ["growk",                "Grok"],
  ["grok",                 "Grok"],
  ["x ai",                 "xAI"],
  ["deep seek",            "DeepSeek"],
  ["deepseek",             "DeepSeek"],
  ["deep seek v3",         "DeepSeek V3"],
  ["cerebras",             "Cerebras"],
  ["perplexity",           "Perplexity"],
  ["cohere",               "Cohere"],
  ["co here",              "Cohere"],
  ["ai 21",                "AI21"],
  ["inflection",           "Inflection"],
  ["pi ai",                "Pi"],
  ["stability ai",         "Stability AI"],
  ["stable diffusion",     "Stable Diffusion"],
  ["mid journey",          "Midjourney"],
  ["midjourney",           "Midjourney"],

  // Open source / local
  ["hugging face",         "Hugging Face"],
  ["huggingface",          "Hugging Face"],
  ["lm studio",            "LM Studio"],
  ["ollama",               "Ollama"],
  ["jan ai",               "Jan"],
  ["open web ui",          "Open WebUI"],
  ["text gen web ui",      "text-generation-webui"],
  ["kobold",               "KoboldAI"],

  // AI/ML concepts
  ["transformer",          "Transformer"],
  ["transformers",         "Transformers"],
  ["reinforcement learning from human feedback", "RLHF"],
  ["r l h f",              "RLHF"],
  ["rlhf",                 "RLHF"],
  ["chain of thought",     "Chain-of-Thought"],
  ["cot",                  "CoT"],
  ["in context learning",  "in-context learning"],
  ["context window",       "context window"],
  ["token",                "token"],
  ["tokenizer",            "tokenizer"],
  ["attention",            "attention"],
  ["multi modal",          "multimodal"],
  ["multimodal",           "multimodal"],
];
