const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong on the MediaGuard server.";

  // Always log the full error server-side
  console.error(`\n❌ [MediaGuard Error] ${status} — ${message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    status,
    message,
  });
};

export default errorHandler;
