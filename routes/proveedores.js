const express = require('express');
const router = express.Router();
const db = require('../db');

// PATCH - Activar modo proveedor
router.patch('/:id/activar-proveedor', async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (usuario.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (usuario.rows[0].es_proveedor) return res.status(400).json({ error: 'Ya es proveedor' });

    await db.query('UPDATE usuarios SET es_proveedor = true WHERE id = $1', [id]);

    const yaExiste = await db.query('SELECT * FROM proveedores WHERE usuario_id = $1', [id]);

    let nuevoProveedor = null;
    if (yaExiste.rowCount === 0) {
      nuevoProveedor = await db.query(
        'INSERT INTO proveedores (nombre, usuario_id) VALUES ($1, $2) RETURNING *',
        [`Proveedor ${id}`, id]
      );
    }

    res.json({
      mensaje: 'Modo proveedor activado',
      proveedor: nuevoProveedor ? nuevoProveedor.rows[0] : 'Ya existía',
    });
  } catch (error) {
    console.error('Error al activar modo proveedor:', error);
    res.status(500).json({ error: 'Error interno al activar modo proveedor' });
  }
});

// POST - Crear proveedor
// POST - Crear proveedor
router.post('/', async (req, res) => {
  const { nombre, usuario_id, ciudad, latitud, longitud } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
  }

  if (!usuario_id || isNaN(Number(usuario_id))) {
    return res.status(400).json({ error: 'El ID del usuario es obligatorio y debe ser numérico' });
  }

  try {
    const yaTieneProveedor = await db.query(
      'SELECT 1 FROM proveedores WHERE usuario_id = $1',
      [usuario_id]
    );

    if (yaTieneProveedor.rowCount > 0) {
      return res.status(409).json({ error: 'Este usuario ya tiene un proveedor registrado' });
    }

    const result = await db.query(
      `INSERT INTO proveedores (nombre, usuario_id, ciudad, latitud, longitud)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        nombre.trim(),
        usuario_id,
        ciudad || null,
        latitud || null,
        longitud || null
      ]
    );

    res.status(201).json({ mensaje: 'Proveedor creado correctamente', proveedor: result.rows[0] });
  } catch (error) {
    console.error('❌ Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error interno al crear proveedor' });
  }
});


// PUT - Actualizar nombre del proveedor (solo si es dueño)
router.put('/:id', async (req, res) => {
  const proveedorId = parseInt(req.params.id);
  const { nombre, usuario_id } = req.body;

  if (!nombre || !usuario_id) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const proveedor = await db.query(
      'SELECT * FROM proveedores WHERE id = $1 AND usuario_id = $2',
      [proveedorId, usuario_id]
    );

    if (proveedor.rowCount === 0) {
      return res.status(403).json({ error: 'No tenés permiso para editar este proveedor' });
    }

    const result = await db.query(
      'UPDATE proveedores SET nombre = $1 WHERE id = $2 RETURNING *',
      [nombre.trim(), proveedorId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'Error interno al actualizar proveedor' });
  }
});

// PATCH - Desactivar proveedor
router.patch('/:id/desactivar', async (req, res) => {
  const proveedorId = parseInt(req.params.id);
  const { usuario_id } = req.body;

  try {
    const proveedor = await db.query(
      'SELECT * FROM proveedores WHERE id = $1 AND usuario_id = $2',
      [proveedorId, usuario_id]
    );

    if (proveedor.rowCount === 0) {
      return res.status(403).json({ error: 'No tenés permiso para desactivar este proveedor' });
    }

    await db.query('UPDATE proveedores SET activo = false WHERE id = $1', [proveedorId]);
    await db.query('UPDATE usuarios SET es_proveedor = false WHERE id = $1', [usuario_id]);

    res.json({ mensaje: 'Proveedor desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar proveedor:', error);
    res.status(500).json({ error: 'Error interno al desactivar proveedor' });
  }
});

// PATCH - Activar proveedor
router.patch('/:id/activar', async (req, res) => {
  const proveedorId = parseInt(req.params.id);
  const { usuario_id } = req.body;

  try {
    const proveedor = await db.query(
      'SELECT * FROM proveedores WHERE id = $1 AND usuario_id = $2',
      [proveedorId, usuario_id]
    );

    if (proveedor.rowCount === 0) {
      return res.status(403).json({ error: 'No tenés permiso para activar este proveedor' });
    }

    await db.query('UPDATE proveedores SET activo = true WHERE id = $1', [proveedorId]);
    await db.query('UPDATE usuarios SET es_proveedor = true WHERE id = $1', [usuario_id]);

    res.json({ mensaje: 'Proveedor reactivado correctamente' });
  } catch (error) {
    console.error('Error al activar proveedor:', error);
    res.status(500).json({ error: 'Error interno al activar proveedor' });
  }
});

module.exports = router;
