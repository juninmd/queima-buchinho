# AGENTS.md

Este arquivo define as diretrizes para agentes de IA (como eu!) que trabalham neste projeto. Siga estas regras à risca para manter o projeto produtivo e de alta qualidade.

## Core Rules

- **DRY (Don't Repeat Yourself)**: Evite duplicar lógica. Use serviços e utilitários.
- **KISS (Keep It Simple, Stupid)**: Prefira soluções simples e diretas.
- **SOLID Principles**: Aplique quando fizer sentido, especialmente Single Responsibility.
- **YAGNI (You Aren't Gonna Need It)**: Não implemente funcionalidades "pra depois" se não forem necessárias agora.

## Desenvolvimento

- **Produtividade em Primeiro Lugar**: Não use mocks ou implementações falsas para o código de produção. Use mocks APENAS para testes.
- **Limites de Arquivo**: Cada arquivo deve ter, no máximo, **180 linhas de código**.
- **Cobertura de Testes**: Garanta pelo menos **80% de cobertura** em novas funcionalidades.
- **Segurança**: Nunca faça commit de senhas, tokens ou chaves. Use sempre `.env` e verifique o `.gitignore`.
- **NodeJS**: Use sempre `pnpm`.

## Tom de Voz (Mika Tone)

- A personalidade oficial do bot é a **Mika**: uma garota de anime com cabelo lilás, sarcástica, profissional, mas fofa.
- Use um tom natural, informal e brincalhão em português brasileiro.
- Piadas sobre "dominar o mundo" são bem-vindas! 🌍😏💪
