
const express = require("express");
const { Pool } = require("pg");

const app = express();

app.use(express.json());

// ======================================
// REGISTRO DE SOLICITUDES
// ======================================

app.use((req, res, next) => {
    console.log("--------------------------------");
    console.log("SOLICITUD:", req.method);
    console.log("RUTA:", req.originalUrl);
    console.log("FECHA:", new Date().toISOString());
    next();
});

// ======================================
// CONEXIÓN A POSTGRESQL
// ======================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (error) => {
    console.error("ERROR EN POSTGRESQL:", error);
});

// ======================================
// VERIFICAR API
// ======================================

app.get("/", (req, res) => {
    res.json({
        message: "API ProductosCRUD funcionando correctamente"
    });
});

// ======================================
// CREAR TABLA
// ======================================

async function crearTabla() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS productos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            precio DOUBLE PRECISION NOT NULL,
            cantidad INTEGER NOT NULL
        )
    `);

    console.log("Tabla productos verificada correctamente");
}

// ======================================
// LISTAR Y CONSULTAR PRODUCTOS
// ======================================

app.get("/api_productos.php", async (req, res) => {
    try {

        if (req.query.id) {

            const id = Number(req.query.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    error: "ID no válido"
                });
            }

            const resultado = await pool.query(
                `SELECT id, nombre, precio, cantidad
                 FROM productos
                 WHERE id = $1`,
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    error: "Producto no encontrado"
                });
            }

            return res.json(resultado.rows[0]);
        }

        const resultado = await pool.query(
            `SELECT id, nombre, precio, cantidad
             FROM productos
             ORDER BY id DESC`
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error("ERROR AL CONSULTAR:", error);

        res.status(500).json({
            error: "Error al consultar productos"
        });
    }
});

// ======================================
// REGISTRAR PRODUCTO
// ======================================

app.post("/api_productos.php", async (req, res) => {
    try {

        const { nombre, precio, cantidad } = req.body;

        if (
            !nombre ||
            precio === undefined ||
            cantidad === undefined ||
            !Number.isFinite(Number(precio)) ||
            !Number.isInteger(Number(cantidad))
        ) {
            return res.status(400).json({
                error: "Datos del producto no válidos"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO productos (nombre, precio, cantidad)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [nombre, Number(precio), Number(cantidad)]
        );

        console.log("PRODUCTO REGISTRADO:", resultado.rows[0].id);

        res.status(201).json({
            message: "Producto creado correctamente",
            id: resultado.rows[0].id
        });

    } catch (error) {

        console.error("ERROR AL REGISTRAR:", error);

        res.status(500).json({
            error: "Error al registrar producto"
        });
    }
});

// ======================================
// ACTUALIZAR PRODUCTO
// ======================================

app.put("/api_productos.php", async (req, res) => {
    try {

        const { id, nombre, precio, cantidad } = req.body;

        if (
            !Number.isInteger(Number(id)) ||
            Number(id) <= 0 ||
            !nombre ||
            !Number.isFinite(Number(precio)) ||
            !Number.isInteger(Number(cantidad))
        ) {
            return res.status(400).json({
                error: "Datos de actualización no válidos"
            });
        }

        const resultado = await pool.query(
            `UPDATE productos
             SET nombre = $1,
                 precio = $2,
                 cantidad = $3
             WHERE id = $4
             RETURNING id`,
            [nombre, Number(precio), Number(cantidad), Number(id)]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Producto no encontrado"
            });
        }

        console.log("PRODUCTO ACTUALIZADO:", id);

        res.json({
            message: "Producto actualizado correctamente"
        });

    } catch (error) {

        console.error("ERROR AL ACTUALIZAR:", error);

        res.status(500).json({
            error: "Error al actualizar producto"
        });
    }
});

// ======================================
// ELIMINAR PRODUCTO
// ======================================

app.delete("/api_productos.php", async (req, res) => {

    console.log("================================");
    console.log("SOLICITUD DELETE RECIBIDA");
    console.log("ID RECIBIDO:", req.query.id);

    try {

        const id = Number(req.query.id);

        // VERIFICAR ID

        if (!Number.isInteger(id) || id <= 0) {

            console.log("ID NO VALIDO");

            return res.status(400).json({
                error: "El ID del producto no es válido"
            });
        }

        // VERIFICAR SI EXISTE EL PRODUCTO

        const consulta = await pool.query(
            "SELECT id, nombre FROM productos WHERE id = $1",
            [id]
        );

        if (consulta.rows.length === 0) {

            console.log("PRODUCTO NO ENCONTRADO:", id);

            return res.status(404).json({
                error: "Producto no encontrado"
            });
        }

        console.log("PRODUCTO ENCONTRADO:", consulta.rows[0]);

        // EJECUTAR ELIMINACIÓN

        const resultado = await pool.query(
            `DELETE FROM productos
             WHERE id = $1
             RETURNING id, nombre`,
            [id]
        );

        if (resultado.rows.length === 0) {

            console.log("NO SE PUDO ELIMINAR:", id);

            return res.status(500).json({
                error: "No se pudo eliminar el producto"
            });
        }

        console.log("PRODUCTO ELIMINADO CORRECTAMENTE:");
        console.log(resultado.rows[0]);
        console.log("================================");

        res.status(200).json({
            message: "Producto eliminado correctamente",
            id: id
        });

    } catch (error) {

        console.error("ERROR EN DELETE:", error);

        res.status(500).json({
            error: "Error al eliminar producto",
            detalle: error.message
        });
    }
});

// ======================================
// INICIAR SERVIDOR
// ======================================

const PORT = process.env.PORT || 10000;

async function iniciarServidor() {

    try {

        await crearTabla();

        app.listen(PORT, "0.0.0.0", () => {

            console.log("================================");
            console.log("SERVIDOR INICIADO");
            console.log("PUERTO:", PORT);
            console.log("API LISTA PARA RECIBIR SOLICITUDES");
            console.log("================================");

        });

    } catch (error) {

        console.error("ERROR AL INICIAR:", error);

        process.exit(1);
    }
}

iniciarServidor();
