const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "API ProductosCRUD funcionando"
  });
});

async function crearTabla() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      precio DOUBLE PRECISION NOT NULL,
      cantidad INTEGER NOT NULL
    )
  `);
}

// LISTAR / CONSULTAR
app.get("/api_productos.php", async (req, res) => {
  try {
    if (req.query.id) {
      const id = parseInt(req.query.id);

      const resultado = await pool.query(
        "SELECT id, nombre, precio, cantidad FROM productos WHERE id = $1",
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
      "SELECT id, nombre, precio, cantidad FROM productos ORDER BY id DESC"
    );

    res.json(resultado.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al consultar productos"
    });
  }
});

// REGISTRAR
app.post("/api_productos.php", async (req, res) => {
  try {
    const { nombre, precio, cantidad } = req.body;

    const resultado = await pool.query(
      `INSERT INTO productos (nombre, precio, cantidad)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [nombre, precio, cantidad]
    );

    res.status(201).json({
      message: "Producto creado",
      id: resultado.rows[0].id
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al registrar producto"
    });
  }
});

// ACTUALIZAR
app.put("/api_productos.php", async (req, res) => {
  try {
    const { id, nombre, precio, cantidad } = req.body;

    const resultado = await pool.query(
      `UPDATE productos
       SET nombre = $1,
           precio = $2,
           cantidad = $3
       WHERE id = $4
       RETURNING id`,
      [nombre, precio, cantidad, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: "Producto no encontrado"
      });
    }

    res.json({
      message: "Producto actualizado"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al actualizar producto"
    });
  }
});

// ELIMINAR
app.delete("/api_productos.php", async (req, res) => {
  try {
    const id = parseInt(req.query.id);

    const resultado = await pool.query(
      "DELETE FROM productos WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: "Producto no encontrado"
      });
    }

    res.json({
      message: "Producto eliminado"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al eliminar producto"
    });
  }
});

const PORT = process.env.PORT || 10000;

crearTabla()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor iniciado en puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error al crear tabla:", error);
    process.exit(1);
  });
