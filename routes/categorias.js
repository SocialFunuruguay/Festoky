// routes/categorias.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET - Todas las categorías organizadas en estructura padre-hijos
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categorias ORDER BY nombre');
    const categorias = result.rows;

    const principales = categorias.filter(cat => cat.categoria_padre_id === null);
    const subcategorias = categorias.filter(cat => cat.categoria_padre_id !== null);

    const estructura = principales.map(cat => ({
      id: cat.id,
      nombre: cat.nombre,
      subcategorias: subcategorias
        .filter(sub => sub.categoria_padre_id === cat.id)
        .map(sub => ({ id: sub.id, nombre: sub.nombre }))
    }));

    res.json(estructura);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'No se pudieron obtener las categorías' });
  }
});

// GET - Lista plana
router.get('/planas', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nombre, categoria_padre_id FROM categorias ORDER BY categoria_padre_id NULLS FIRST, nombre'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener lista plana de categorías:', error);
    res.status(500).json({ error: 'No se pudo obtener la lista plana de categorías' });
  }
});

// GET - Una sola categoría
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('SELECT * FROM categorias WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ error: 'Error interno al obtener la categoría' });
  }
});

// POST - Crear categoría
router.post('/', async (req, res) => {
  const { nombre, categoria_padre_id } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
  }

  try {
    const result = await db.query(
      'INSERT INTO categorias (nombre, categoria_padre_id) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), categoria_padre_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error interno al crear categoría' });
  }
});

// PUT - Actualizar categoría
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, categoria_padre_id } = req.body;

  try {
    const result = await db.query(
      'UPDATE categorias SET nombre = COALESCE($1, nombre), categoria_padre_id = COALESCE($2, categoria_padre_id) WHERE id = $3 RETURNING *',
      [nombre, categoria_padre_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada para actualizar' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error interno al actualizar la categoría' });
  }
});

// DELETE - Eliminar categoría
router.delete('/:id', async (req, res) => {
  const categoriaId = parseInt(req.params.id);

  if (isNaN(categoriaId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const existe = await db.query('SELECT * FROM categorias WHERE id = $1', [categoriaId]);
    if (existe.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const subcategorias = await db.query('SELECT * FROM categorias WHERE categoria_padre_id = $1', [categoriaId]);
    if (subcategorias.rowCount > 0) {
      return res.status(409).json({ error: 'Esta categoría tiene subcategorías. Eliminá o reasigná primero.' });
    }

    const servicios = await db.query('SELECT * FROM servicios WHERE categoria_id = $1', [categoriaId]);
    if (servicios.rowCount > 0) {
      return res.status(409).json({ error: 'Esta categoría está en uso por servicios. No se puede eliminar.' });
    }

    const result = await db.query('DELETE FROM categorias WHERE id = $1 RETURNING *', [categoriaId]);
    res.json({ mensaje: 'Categoría eliminada con éxito', categoria: result.rows[0] });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error interno al eliminar categoría' });
  }
});

module.exports = router;
