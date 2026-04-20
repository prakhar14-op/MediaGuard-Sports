const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  console.error(`❌ [${status}] ${message}`);
  if (process.env.NODE_ENV !== "production") console.error(err.stack);

  res.status(status).json({ success: false, status, message });
};

export default errorHandler;
