export const parse = (schema) => (req, _res, next) => {
  try {
    if (req.method === "GET") req.valid = schema.parse({ query: req.query });
    else req.valid = schema.parse({ body: req.body, params: req.params });
    next();
  } catch (e) {
    next({ status:400, message:e.errors?.[0]?.message || "Validation error" });
  }
};





