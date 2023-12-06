const { body, check } = require('express-validator');
const { validatorMiddleware } = require('../helpers/helpers');

module.exports.validate = (method) => {
  switch (method) {
    case 'Create': {
      return [
       // body('Title')
       //   .notEmpty()
        //  .withMessage('Please enter category')
        //  .isLength({ min: 3, max: 20 })
        //  .withMessage('Category should be min 3 and max 20 characters.'),
      //  validatorMiddleware,
      ];
    }
    case 'Update': {
      return [
        body('id').notEmpty().withMessage('Please enter id.'),
       // body('name')
       //   .notEmpty()
       //   .withMessage('Please enter category')
       //   .isLength({ min: 3, max: 20 })
       //   .withMessage('Category should be min 3 and max 20 characters.'),
        validatorMiddleware,
      ];
    }
    case 'Delete': {
      return [
        check('id').isLength({ min: 1 }).withMessage('Id is missing.'),
        validatorMiddleware,
      ];
    }
  }
};
