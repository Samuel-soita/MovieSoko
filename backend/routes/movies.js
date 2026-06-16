const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movieController');

router.get('/free', async (req, res) => {
  req.params = { category: 'free' };
  return require('../controllers/movieController').getByCategory(req, res);
});

router.get('/home', ctrl.getAllRows);
router.get('/featured', ctrl.getFeatured);
router.get('/trending', ctrl.getTrending);
router.get('/popular', ctrl.getPopular);
router.get('/new', ctrl.getNew);
router.get('/upcoming', ctrl.getUpcoming);
router.get('/genres', ctrl.getGenres);
router.get('/genre/:genre', ctrl.getByGenre);
router.get('/search', ctrl.searchMovies);
router.get('/:id', ctrl.getMovieById);

module.exports = router;
