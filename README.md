# Sistema de Gerenciamento de Férias 🏖️

## Descrição do Projeto - testando alterações

Este é um sistema de gerenciamento de férias desenvolvido para empresas, permitindo que funcionários controlem e visualizem seus períodos de férias de forma simples e intuitiva.

## Funcionalidades Principais

- 🔐 Autenticação de usuários
- 📅 Visualização de calendário de férias
- ✅ Controle de saldo de férias
- 🗓️ Adição e gerenciamento de períodos de férias
- 🚫 Validação de períodos (limite de 3 períodos, saldo disponível)

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Firebase Authentication
- **Banco de Dados**: Firebase Realtime Database
- **Hospedagem**: Firebase Hosting

## Pré-requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conta no Firebase
- Conexão com a internet

## Configuração do Projeto

### Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/sistema-ferias.git
cd sistema-ferias
```

### Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative Authentication e Realtime Database
3. Copie as configurações de configuração para `firebase-config.js`

### Implantação

#### Desenvolvimento Local

1. Abra o `index.html` em seu navegador
2. Faça login com suas credenciais

#### Deploy

```bash
# Instale o Firebase CLI
npm install -g firebase-tools

# Faça login no Firebase
firebase login

# Inicialize o projeto (se ainda não estiver inicializado)
firebase init

# Faça deploy
firebase deploy
```

## Segurança

- Autenticação obrigatória
- Dados de usuário protegidos no Firebase
- Regras de segurança implementadas no Realtime Database

## Contribuição

1. Faça um fork do projeto
2. Crie sua branch de feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE.md para detalhes.

## Suporte

Em caso de dúvidas ou problemas, abra uma issue no GitHub ou entre em contato com o suporte.

---

**Desenvolvido com ❤️ pela Equipe de Desenvolvimento**
