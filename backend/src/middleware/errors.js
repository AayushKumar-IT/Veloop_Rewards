export function notFound(req, res) {
  return res.status(404).json({ code: 'NOT_FOUND', message: 'We could not find that resource.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_REQUEST', message: 'Please check the information and try again.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large.' });
  }
  if (error.name === 'ZodError') {
    return res.status(400).json({ code: 'INVALID_REQUEST', message: 'Please check the information and try again.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ code: 'ALREADY_PARTICIPATING', message: 'You are already participating in this giveaway.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ code: 'INVALID_REQUEST', message: 'The submitted information is not valid.' });
  }
  console.error(JSON.stringify({ level: 'error', requestId: req.requestId, message: error.message, name: error.name }));
  return res.status(error.statusCode ?? 500).json({
    code: error.codeName ?? 'INTERNAL_ERROR',
    message: error.statusCode ? error.message : 'We could not complete that request. Please try again.',
  });
}
