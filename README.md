# JuliusBet (Demo)

Pequeno projeto didático de interface para apostas (front-end somente).

Resumo
- Implementação puramente front-end (HTML/CSS/JS). Dados de usuário e saldo são mantidos no `localStorage` para demonstração.
- Não é um sistema de apostas real — apenas demonstrações de UI/UX e lógica cliente-side.

Principais recursos
- Listagem de partidas com odds e interface de aposta (modal).
- Perfil do usuário com saldo, histórico e resolução de apostas (simulação).
- Mobile-friendly: menu hambúrguer e layout responsivo.
- Ícones via FontAwesome (CDN injetado dinamicamente pelo `main.js`).

Como usar
1. Abrir `index.html` em um navegador moderno (suporta módulos ES).
2. Página `conta.html` permite registrar/entrar com usuários de exemplo.
3. Apostas e saldo são salvos no `localStorage` do navegador (apenas para demo).

Notas de segurança (importante)
- Este projeto é para fins didáticos. Não armazene senhas reais aqui.
- Autenticação é feita no cliente e não é segura. Em produção, implemente um backend seguro, hashing de senhas e tokens HTTP-only.

Melhorias aplicadas (rápidas)
- Menu hambúrguer responsivo (aparece apenas em telas pequenas).
- Substituição de emojis por ícones FontAwesome.
- Removidos usos de `javascript:` em `href` e substituídos por event listeners (melhor prática).

Como contribuir
- Faça fork, crie uma branch, aplique melhorias e abra um PR.

Licença
- Código aberto para uso didático.
