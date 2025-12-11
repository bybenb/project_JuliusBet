# JuliusBet (Demo)

Pequeno projeto didático de interface para apostas (front-end somente). Detém implementação puramente front-end (HTML/CSS/JS). Os Dados de usuário e saldo são mantidos no `localStorage` para demonstração.

+ Veja o nosso projecto [Aqui](https://bybenb.github.io/project_JuliusBet)

`Nota:`  Não é um sistema de apostas real — apenas demonstrações de UI/UX e lógica cliente-side.




##  Equipa & Créditos


- **Beny Reis** - [@bkapa8](https://www.instagram.com/bkapa8/)

- **Nazaré Sant'Ana** - [@iamnaza1](https://www.instagram.com/iamnaza1/)
- **Júlio Peliganga** - [@juliopelinganga](https://www.instagram.com/juliopelinganga/)
- **Jolinda Cabando**
- **Etelvina Simião** - [@taysimiao](https://www.instagram.com/taysimiao/)
- **Ed Cremilda** - [@edsureny](https://www.instagram.com/edsurenycremilda/)
- **Aldo Bruno** - [@aldo.dasilva](https://www.facebook.com/aldo.dasilva.7146/)

- **Hernani Machado** - [@bengazai](https://www.instagram.com/bengazai/)

---
- [MHRAP](https://www.youtube.com/@MHRAPOFICIAL) - *suas [músicas](https://www.youtube.com/watch?v=uCyVx1vYDz8&list=RDuCyVx1vYDz8&start_radio=1&pp=ygUTbWhyYXAgbXVuZG8gdmlydHVhbKAHAQ%3D%3D) foram ouvidas na inspiração e ârea de trablho*
---



## Parte Técnica (blablabla)

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
