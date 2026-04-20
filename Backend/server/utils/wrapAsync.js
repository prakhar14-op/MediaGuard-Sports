const wrapAsync = (fn) => {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

export default wrapAsync;
