const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /notificaciones?usuario_id=...&proveedor_id=...&leida=...
router.get('/notificaciones', async (req, res) => {
  const { usuario_id, proveedor_id, leida } = req.query;

  try {
    let query = 'SELECT * FROM notificaciones WHERE ';
    const params = [];
    let conditions = [];

    if (usuario_id) {
      params.push(usuario_id);
      conditions.push(`usuario_id = $${params.length}`);
    }

    if (proveedor_id) {
      params.push(proveedor_id);
      conditions.push(`proveedor_id = $${params.length}`);
    }

    if (leida !== undefined) {
      params.push(leida === 'true');
      conditions.push(`leida = $${params.length}`);
    }

    if (conditions.length === 0) {
      return res.status(400).json({ error: 'Debes indicar usuario_id o proveedor_id' });
    }

    query += conditions.join(' AND ') + ' ORDER BY creada_en DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error interno al obtener notificaciones' });
  }
});

// PUT /notificaciones/:id → Marcar como leída
router.put('/notificaciones/:id', async (req, res) => {
  const notificacionId = parseInt(req.params.id);

  if (isNaN(notificacionId)) {
    return res.status(400).json({ error: 'ID inválido de notificación' });
  }

  try {
    const result = await db.query(
      `UPDATE notificaciones
       SET leida = true
       WHERE id = $1
       RETURNING *`,
      [notificacionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar notificación:', error);
    res.status(500).json({ error: 'Error interno al actualizar notificación' });
  }
});

module.exports = router;
