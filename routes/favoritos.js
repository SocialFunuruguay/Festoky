const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken } = require('../middleware/auth');

// POST - Agregar favorito
router.post('/', verificarToken, async (req, res) => {
  const { servicio_id } = req.body;
  const usuario_id = req.usuario.id;

  if (!servicio_id) {
    return res.status(400).json({ error: 'El ID del servicio es obligatorio' });
  }

  try {
    const existe = await db.query(
      'SELECT 1 FROM favoritos WHERE usuario_id = $1 AND servicio_id = $2',
      [usuario_id, servicio_id]
    );

    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'Este servicio ya está en favoritos' });
    }

    const result = await db.query(
      'INSERT INTO favoritos (usuario_id, servicio_id) VALUES ($1, $2) RETURNING *',
      [usuario_id, servicio_id]
    );

    res.status(201).json({ mensaje: 'Agregado a favoritos', favorito: result.rows[0] });
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

// GET - Obtener favoritos del usuario
router.get('/', verificarToken, async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const result = await db.query(
      `SELECT 
        f.id AS favorito_id,
        s.*,
        categorias.nombre AS nombre_categoria,
        proveedores.nombre AS nombre_proveedor,
        ciudades.nombre AS nombre_ciudad
       FROM favoritos f
       JOIN servicios s ON f.servicio_id = s.id
       JOIN categorias ON s.categoria_id = categorias.id
       JOIN proveedores ON s.proveedor_id = proveedores.id
       JOIN ciudades ON s.ciudad_id = ciudades.id
       WHERE f.usuario_id = $1
       ORDER BY f.creado_en DESC`,
      [usuario_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

// DELETE - Quitar de favoritos
router.delete('/:id', verificarToken, async (req, res) => {
  const favorito_id = parseInt(req.params.id);
  const usuario_id = req.usuario.id;

  try {
    const verificacion = await db.query(
      'SELECT * FROM favoritos WHERE id = $1 AND usuario_id = $2',
      [favorito_id, usuario_id]
    );

    if (verificacion.rowCount === 0) {
      return res.status(403).json({ error: 'No autorizado para eliminar este favorito' });
    }

    await db.query('DELETE FROM favoritos WHERE id = $1', [favorito_id]);
    res.json({ mensaje: 'Favorito eliminado' });
  } catch (error) {
    console.error('Error al eliminar favorito:', error);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

module.exports = router;

