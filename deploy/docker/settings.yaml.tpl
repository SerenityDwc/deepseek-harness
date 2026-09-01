# Seeded into $DSH_HOME/settings.yaml on first start. Keys come from env vars.
# Edit this file in the volume (or via the Web UI) after the first boot.

ui-onboarding:
  welcomeNoticeVersion: 2026-08-13.1
ui-theme:
  preference: dark

llm-pi-ai:
  providers:
    shensuanyun:
      displayName: 胜算云路由网关
      apiKeyEnv: SHENSUANYUN_API_KEY
      api: openai-completions
      baseURL: https://router.shengsuanyun.com/api/v1
      models:
        - id: deepseek/deepseek-v4-pro-0813
          name: DeepSeek-V4-Pro-0813
          contextWindow: 1000000
          maxTokens: 384000
        - id: deepseek/deepseek-v4-flash
          name: DeepSeek-V4-Flash
          contextWindow: 1000000
          maxTokens: 384000
        - id: anthropic/claude-fable-5
          name: Claude Fable 5
          contextWindow: 1000000
          maxTokens: 128000
        - id: openai/gpt-5.5
          name: GPT-5.5
          contextWindow: 400000
          maxTokens: 128000
        - id: moonshot/kimi-k3
          name: Kimi K3
          contextWindow: 1000000
          maxTokens: 132000
        - id: minimax/minimax-m3
          name: MiniMax M3
          contextWindow: 1000000
          maxTokens: 1000000
        - id: ali/qwen3.8-max
          name: Qwen3.8-Max
          contextWindow: 1000000
          maxTokens: 128000
    zai-coding-cn:
      displayName: 智谱GLM
      apiKeyEnv: ZAI_CODING_CN_API_KEY
      api: openai-completions
      baseURL: https://open.bigmodel.cn/api/paas/v4
      models:
        - id: glm-5.2
          name: GLM-5.2
          contextWindow: 1000000
          maxTokens: 131072
    deepseek:
      displayName: DeepSeek
      apiKeyEnv: DEEPSEEK_API_KEY
      api: openai-completions
      baseURL: https://api.deepseek.com
      models:
        - id: deepseek-chat
          name: DeepSeek Chat
          contextWindow: 128000
          maxTokens: 8192
        - id: deepseek-reasoner
          name: DeepSeek Reasoner
          contextWindow: 128000
          maxTokens: 65536

agent-default-model:
  provider: shensuanyun
  model: deepseek/deepseek-v4-flash

agent-presets:
  default: voltcell
