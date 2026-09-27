require("dotenv").config();

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

const pagina = path.join(__dirname, "index.html");

const porta = Number(process.env.PORT || 3000);


// =======================================================
// CONEXÃO COM POSTGRESQL
// =======================================================

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    ssl: process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false
        }
        : false
});


// =======================================================
// FUNÇÃO PARA LER JSON DA REQUISIÇÃO
// =======================================================

function lerBody(req) {

    return new Promise((resolve, reject) => {

        let body = "";

        req.on("data", chunk => {

            body += chunk.toString();

        });

        req.on("end", () => {

            try {

                const dados = body
                    ? JSON.parse(body)
                    : {};

                resolve(dados);

            }
            catch (erro) {

                reject(erro);

            }

        });

    });

}


// =======================================================
// FUNÇÃO PARA RETORNAR JSON
// =======================================================

function responderJson(res, status, dados) {

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));

}


// =======================================================
// SERVIDOR
// =======================================================

const servidor = http.createServer(async (req, res) => {

    try {

        const url = new URL(
            req.url,
            `http://${req.headers.host}`
        );


        // ===================================================
        // INDEX.HTML
        // ===================================================

        if (
            req.method === "GET" &&
            url.pathname === "/"
        ) {

            fs.readFile(pagina, (erro, conteudo) => {

                if (erro) {

                    console.error(
                        "Erro ao carregar página:",
                        erro
                    );

                    res.writeHead(500, {
                        "Content-Type": "text/plain; charset=utf-8"
                    });

                    return res.end(
                        "Erro ao carregar página."
                    );

                }

                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8"
                });

                res.end(conteudo);

            });

            return;

        }


        // ===================================================
        // GET /api/clientes
        // CONSULTAR CLIENTES
        // ===================================================

        if (
            req.method === "GET" &&
            url.pathname === "/api/clientes"
        ) {

            const resultado = await pool.query(`
                SELECT
                    id,
                    nome,
                    email,
                    datahoracadastro
                FROM clientes
                ORDER BY id DESC
            `);

            return responderJson(
                res,
                200,
                resultado.rows
            );

        }


        // ===================================================
        // POST /api/clientes
        // CADASTRAR CLIENTE
        // ===================================================

        if (
            req.method === "POST" &&
            url.pathname === "/api/clientes"
        ) {

            const dados = await lerBody(req);

            const nome = dados.nome?.trim();
            const email = dados.email?.trim().toLowerCase();


            if (!nome || !email) {

                return responderJson(
                    res,
                    400,
                    {
                        mensagem:
                            "Nome e e-mail são obrigatórios."
                    }
                );

            }


            const resultado = await pool.query(
                `
                INSERT INTO clientes (
                    nome,
                    email
                )
                VALUES (
                    $1,
                    $2
                )
                RETURNING
                    id,
                    nome,
                    email,
                    datahoracadastro
                `,
                [
                    nome,
                    email
                ]
            );


            return responderJson(
                res,
                201,
                resultado.rows[0]
            );

        }


        // ===================================================
        // PUT /api/clientes/:id
        // EDITAR CLIENTE
        // ===================================================

        const rotaCliente =
            url.pathname.match(
                /^\/api\/clientes\/(\d+)$/
            );


        if (
            req.method === "PUT" &&
            rotaCliente
        ) {

            const id = Number(rotaCliente[1]);

            const dados = await lerBody(req);

            const nome = dados.nome?.trim();
            const email = dados.email?.trim().toLowerCase();


            if (!nome || !email) {

                return responderJson(
                    res,
                    400,
                    {
                        mensagem:
                            "Nome e e-mail são obrigatórios."
                    }
                );

            }


            const resultado = await pool.query(
                `
                UPDATE clientes
                SET
                    nome = $1,
                    email = $2
                WHERE id = $3
                RETURNING
                    id,
                    nome,
                    email,
                    datahoracadastro
                `,
                [
                    nome,
                    email,
                    id
                ]
            );


            if (resultado.rowCount === 0) {

                return responderJson(
                    res,
                    404,
                    {
                        mensagem:
                            "Cliente não encontrado."
                    }
                );

            }


            return responderJson(
                res,
                200,
                resultado.rows[0]
            );

        }


        // ===================================================
        // DELETE /api/clientes/:id
        // EXCLUIR CLIENTE
        // ===================================================

        if (
            req.method === "DELETE" &&
            rotaCliente
        ) {

            const id = Number(rotaCliente[1]);


            const resultado = await pool.query(
                `
                DELETE FROM clientes
                WHERE id = $1
                RETURNING id
                `,
                [
                    id
                ]
            );


            if (resultado.rowCount === 0) {

                return responderJson(
                    res,
                    404,
                    {
                        mensagem:
                            "Cliente não encontrado."
                    }
                );

            }


            return responderJson(
                res,
                200,
                {
                    mensagem:
                        "Cliente excluído com sucesso."
                }
            );

        }


        // ===================================================
        // ROTA NÃO ENCONTRADA
        // ===================================================

        responderJson(
            res,
            404,
            {
                mensagem:
                    "Recurso não encontrado."
            }
        );

    }
    catch (erro) {

        console.error(erro);


        // PostgreSQL UNIQUE VIOLATION

        if (erro.code === "23505") {

            return responderJson(
                res,
                400,
                {
                    mensagem:
                        "Este e-mail já está cadastrado."
                }
            );

        }


        responderJson(
            res,
            500,
            {
                mensagem:
                    "Erro interno do servidor."
            }
        );

    }

});


// =======================================================
// TESTAR CONEXÃO COM POSTGRESQL
// =======================================================

pool.query("SELECT NOW()")
    .then(resultado => {

        console.log(
            "PostgreSQL conectado com sucesso."
        );

        console.log(
            "Horário do banco:",
            resultado.rows[0].now
        );

    })
    .catch(erro => {

        console.error(
            "Erro ao conectar no PostgreSQL:"
        );

        console.error(erro);

    });


// =======================================================
// INICIAR SERVIDOR
// =======================================================

servidor.listen(
    porta,
    "0.0.0.0",
    () => {

        console.log(
            `Servidor iniciado na porta ${porta}`
        );

    }
);