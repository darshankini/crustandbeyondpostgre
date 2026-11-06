// /api/recipes — route -> validate -> controller -> service -> repository
const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { validate } = require('../validators/common');
const v = require('../validators/recipe.validator');
const c = require('../controllers/recipe.controller');

router.use(requireAuth);

router.get('/', c.list);                                   // recipe list
router.get('/:id', validate(v.idParam), c.edit);           // editRecipe: one recipe + raw items
router.post('/', validate(v.add), c.add);                  // addRecipe
router.post('/update', validate(v.update), c.update);      // updateRecipe { recipe_id, ... }
router.delete('/:id', validate(v.idParam), c.remove);      // deleteRecipe

module.exports = router;
