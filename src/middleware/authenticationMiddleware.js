const AppError = require('../utils/AppError');
function authenticate(req, res, next) {
    // Custom authentication logic
    if (req.headers.authorization === process.env.AUTH_TOKEN) {
        return next(); // User is authenticated
    } else {
        next(new AppError(`Unauthorized Access`, 401));
    }
}

module.exports = { authenticate };