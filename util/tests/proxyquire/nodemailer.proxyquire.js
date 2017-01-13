
module.exports = {
	'nodemailer': getNodemailerMock
};

function getNodemailerMock() {
	const mailErrors = {};
	return {
		createTransport: function(options) {
			return {
				sendMail: function(mailOptions, callback) {
					if (mailErrors[mailOptions.to]) {
						callback({ error: mailErrors[mailOptions.to], mailOptions: mailOptions });
					}
					else {
						callback();
					}
				}
			};
		},
		proxyAccessMethods: {
			nodemailerEmailErrors: mailErrors
		}
	};
}