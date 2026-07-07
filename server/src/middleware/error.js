// Central error handler. Controllers call next(error) and end up here.
export function errorHandler(err, req, res, next) {  // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
}
