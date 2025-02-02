const { body, param, validationResult } = require("express-validator");

// Malzeme validasyonları
const materialValidators = {
  create: [
    body("code")
      .notEmpty()
      .withMessage("Malzeme kodu zorunludur")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Malzeme kodu en az 3 karakter olmalıdır"),
    body("name")
      .notEmpty()
      .withMessage("Malzeme adı zorunludur")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Malzeme adı en az 3 karakter olmalıdır"),
  ],
  update: [
    param("id").isInt().withMessage("Geçersiz malzeme ID"),
    body("code")
      .notEmpty()
      .withMessage("Malzeme kodu zorunludur")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Malzeme kodu en az 3 karakter olmalıdır"),
    body("name")
      .notEmpty()
      .withMessage("Malzeme adı zorunludur")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Malzeme adı en az 3 karakter olmalıdır"),
  ],
};

// Talep validasyonları
const requestValidators = {
  create: [
    body("project_id")
      .notEmpty()
      .withMessage("Proje ID zorunludur")
      .isInt()
      .withMessage("Geçersiz proje ID"),
    body("material_id")
      .notEmpty()
      .withMessage("Malzeme ID zorunludur")
      .isInt()
      .withMessage("Geçersiz malzeme ID"),
    body("requested_qty")
      .notEmpty()
      .withMessage("Talep miktarı zorunludur")
      .isFloat({ min: 0.1 })
      .withMessage("Talep miktarı 0'dan büyük olmalıdır"),
  ],
  update: [
    param("id").isInt().withMessage("Geçersiz talep ID"),
    body("status")
      .optional()
      .isIn(["pending", "approved", "rejected", "delivered"])
      .withMessage("Geçersiz durum değeri"),
    body("revised_qty")
      .optional()
      .isFloat({ min: 0.1 })
      .withMessage("Revize miktar 0'dan büyük olmalıdır"),
  ],
};

// Teslimat validasyonları
const deliveryValidators = {
  complete: [
    param("request_id")
      .notEmpty()
      .withMessage("Talep ID zorunludur")
      .isInt()
      .withMessage("Geçersiz talep ID"),
  ],
};

// Validasyon sonuçlarını kontrol eden middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validasyon hatası");
    error.status = 400;
    error.details = errors.array();
    return next(error);
  }
  next();
};

module.exports = {
  materialValidators,
  requestValidators,
  deliveryValidators,
  validate,
};
