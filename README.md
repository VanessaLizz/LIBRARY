📚 Library

Sistema web para gerenciamento de livros e acompanhamento de leituras.

O **Library** permite organizar uma biblioteca pessoal, cadastrar livros, acompanhar leituras e visualizar informações sobre o progresso de leitura por meio de um dashboard.

## Funcionalidades

📖 Biblioteca

➕ Cadastro manual de livros
🔍 Busca de livros por nome
📚 Busca por ISBN-10 e ISBN-13
📝 Cadastro de informações como:

  * Título
  * Autores
  * Editora
  * ISBN
  * Número de páginas
  * Gênero
  * Formato
  * Idioma
  * Capa
* Organização dos livros por status e propriedade

📅 Leituras

* Registro de leituras
* Acompanhamento do progresso
* Registro de páginas lidas
* Avaliação dos livros
* Registro de datas de leitura
* Registro de livros concluídos
* Histórico de leituras

📊 Dashboard

* Quantidade de livros cadastrados
* Indicadores relacionados às leituras
* Acompanhamento das informações de leitura

> O projeto está em desenvolvimento e algumas funcionalidades de busca e sincronização do histórico estão passando por melhorias.

🛠️ Tecnologias utilizadas

⚛️ React
🔷 TypeScript
⚡ Vite
🎨 Tailwind CSS
🗄️ Supabase
🐘 PostgreSQL
📊 Recharts
📚 Google Books API
🔎 Open Library API

🗄️ Banco de Dados

O projeto utiliza **Supabase** para armazenamento dos dados e autenticação.

Principais entidades:

* `books`
* `readings`
* `authors`
* `book_authors`
* `book_genres`
* `publishers`
* `series`
* `quotes`
* `profiles`

Os relacionamentos entre livros, autores, gêneros, editoras, séries e leituras são mantidos no banco de dados.

🔌 APIs

Atualmente o sistema utiliza APIs externas para auxiliar na busca e preenchimento das informações dos livros.

### Google Books API

Utilizada como uma das principais fontes de dados bibliográficos.

### Open Library

Utilizada como fonte alternativa para busca e recuperação de informações de livros.

Outras fontes de dados estão sendo avaliadas para ampliar a cobertura das buscas.

⚙️ Configuração

Clone o projeto:

```bash
git clone https://github.com/VanessaLizz/LIBRARY.git
cd LIBRARY
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_GOOGLE_BOOKS_API_KEY=sua_chave_da_google_books_api
```

Inicie o projeto:

```bash
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

📁 Estrutura

```text
src/
├── components/
├── context/
├── hooks/
├── lib/
├── pages/
├── types/
└── main.tsx
```

## Objetivo do projeto

O projeto foi desenvolvido para aplicar conhecimentos de desenvolvimento web, banco de dados, APIs, autenticação, organização de dados e visualização de informações, tendo como inspiração a plataforma skoob.

Além de funcionar como uma biblioteca pessoal, o projeto está sendo utilizado como parte do meu portfólio de desenvolvimento.

🚧 Status

**Em desenvolvimento**

Funcionalidades principais já implementadas:

* Cadastro de livros
* Biblioteca
* Busca por nome
* Cadastro de leituras
* Registro de livros concluídos
* Dashboard
* Integração com Supabase
* Integração com APIs de livros

Próximas melhorias:

* Aprimoramento da busca por ISBN
* Ampliação das fontes de pesquisa de livros
* Melhorias no histórico de leituras
* Sincronização dos dados de leitura com o Dashboard
* Novos recursos de organização e análise da biblioteca

