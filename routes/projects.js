const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Project } = require('../models');
const debug = require('debug')('app:projects');
const { logger } = require('../services/loggerService');

// Projeleri listele
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (error) {
    logger.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proje detayı
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    logger.error('Error getting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Yeni proje oluştur
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proje güncelle
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    await project.update(req.body);
    res.json(project);
  } catch (error) {
    logger.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proje sil
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    await project.destroy();
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;