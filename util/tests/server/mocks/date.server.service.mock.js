exports.isNotMocked = function() {
	return false;
};

exports.proxyAccessMethods = {
	isNotMocked: exports.isNotMocked
};