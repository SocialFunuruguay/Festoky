const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken } = require('../middleware/auth');



// POST - Crear nuevo servicio
router.post('/', async (req, res) => {
  const { nombre, proveedor_id, categoria_id, precio, descripcion, visible, ciudad_id } = req.body;

  if (!nombre || !proveedor_id || !categoria_id || !ciudad_id) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const existe = await db.query(
      `SELECT 1 FROM servicios WHERE LOWER(TRIM(nombre)) = $1 AND proveedor_id = $2`,
      [nombre.trim().toLowerCase(), proveedor_id]
    );

    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'Ya tenés un servicio con ese nombre registrado' });
    }

    const result = await db.query(
      `INSERT INTO servicios (nombre, proveedor_id, categoria_id, precio, descripcion, visible, ciudad_id)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), $7)
       RETURNING *`,
      [nombre.trim(), proveedor_id, categoria_id, precio || null, descripcion || null, visible, ciudad_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error interno al crear servicio' });
  }
});

// PUT - Actualizar servicio
router.put('/:id', async (req, res) => {
  const servicioId = parseInt(req.params.id);
  const { nombre, categoria_id, precio, descripcion, visible, proveedor_id } = req.body;

  if (!proveedor_id) {
    return res.status(400).json({ error: 'El ID del proveedor es obligatorio' });
  }

  try {
    const verificacion = await db.query(
      'SELECT * FROM servicios WHERE id = $1 AND proveedor_id = $2',
      [servicioId, proveedor_id]
    );

    if (verificacion.rowCount === 0) {
      return res.status(403).json({ error: 'No tenés permiso para editar este servicio' });
    }

    const result = await db.query(
      `UPDATE servicios
       SET nombre = COALESCE($1, nombre),
           categoria_id = COALESCE($2, categoria_id),
           precio = COALESCE($3, precio),
           descripcion = COALESCE($4, descripcion),
           visible = COALESCE($5, visible)
       WHERE id = $6
       RETURNING *`,
      [nombre, categoria_id, precio, descripcion, visible, servicioId]
    );

    res.json({ mensaje: 'Servicio actualizado', servicio: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error interno al actualizar el servicio' });
  }
});

// DELETE - Eliminar servicio (autenticado)
// DELETE - Eliminar servicio (autenticado)
router.delete('/:id', verificarToken, async (req, res) => {
  const servicioId = parseInt(req.params.id);
  const usuarioId = req.usuario.id;

  if (isNaN(servicioId)) {
    return res.status(400).json({ error: 'ID de servicio inválido' });
  }

  try {
    const verificacion = await db.query(
      `SELECT servicios.id
       FROM servicios
       JOIN proveedores ON servicios.proveedor_id = proveedores.id
       WHERE servicios.id = $1 AND proveedores.usuario_id = $2`,
      [servicioId, usuarioId]
    );

    if (verificacion.rowCount === 0) {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este servicio' });
    }

    const result = await db.query(
      'DELETE FROM servicios WHERE id = $1 RETURNING *',
      [servicioId]
    );

    res.json({ mensaje: 'Servicio eliminado con éxito', servicio: result.rows[0] });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error interno al eliminar servicio' });
  }
});

// GET - Obtener servicios con filtros
router.get('/', async (req, res) => {
  const {
    nombre,
    categoria_id,
    proveedor_id,
    visible,
    ciudad_id,
    precio_min,
    precio_max,
    destacado
  } = req.query;

  let condiciones = [];
  let valores = [];

  if (nombre) {
    condiciones.push(`LOWER(servicios.nombre) LIKE $${valores.length + 1}`);
    valores.push(`%${nombre.toLowerCase()}%`);
  }

  if (categoria_id) {
    condiciones.push(`servicios.categoria_id = $${valores.length + 1}`);
    valores.push(parseInt(categoria_id));
  }

  if (proveedor_id) {
    condiciones.push(`servicios.proveedor_id = $${valores.length + 1}`);
    valores.push(parseInt(proveedor_id));
  }

  if (ciudad_id) {
    condiciones.push(`servicios.ciudad_id = $${valores.length + 1}`);
    valores.push(parseInt(ciudad_id));
  }

  if (visible === 'true' || visible === 'false') {
    condiciones.push(`servicios.visible = $${valores.length + 1}`);
    valores.push(visible === 'true');
  }

  if (precio_min) {
    condiciones.push(`servicios.precio >= $${valores.length + 1}`);
    valores.push(parseFloat(precio_min));
  }

  if (precio_max) {
    condiciones.push(`servicios.precio <= $${valores.length + 1}`);
    valores.push(parseFloat(precio_max));
  }

  if (destacado === 'true') {
    condiciones.push(`servicios.destacado = true`);
  }

  const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const result = await db.query(
      `SELECT 
        servicios.id,
        servicios.nombre,
        servicios.precio,
        servicios.descripcion,
        servicios.visible,
        servicios.destacado,
        categorias.nombre AS nombre_categoria,
        proveedores.nombre AS nombre_proveedor,
        ciudades.nombre AS nombre_ciudad
      FROM servicios
      JOIN categorias ON servicios.categoria_id = categorias.id
      JOIN proveedores ON servicios.proveedor_id = proveedores.id
      JOIN ciudades ON servicios.ciudad_id = ciudades.id
      ${whereClause}
      ORDER BY servicios.destacado DESC, servicios.id`,
      valores
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error interno al obtener servicios' });
  }
});

module.exports = router;
