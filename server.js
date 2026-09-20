const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const pagina = path.join(__dirname, "index.html");

// Usa a porta do ambiente AWS ou 3000 na execução local.
const porta = Number(process.env.PORT || 3000);

const servidor = http.createServer((req, res) => {
  if (req.method !== "GET" || req.url !== "/") {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    return res.end("Página não encontrada.");
  }

  fs.readFile(pagina, (erro, conteudo) => {
    if (erro) {
      console.error("Erro ao carregar a página:", erro);

      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8"
      });

      return res.end("Erro ao carregar a página.");
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    res.end(conteudo);
  });
});

// Escuta em todas as interfaces de rede.
servidor.listen(porta, "0.0.0.0", () => {
  console.log(`Servidor iniciado na porta ${porta}`);
});