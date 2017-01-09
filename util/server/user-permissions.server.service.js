'use strict';

/** @module util/server/models/user-permissions */
var _ = require('lodash'),
	config = require('../../lib/config');


/**
 * @summary Check if provided argument is a MongoDB Object ID
 * @param id {any}
 * @returns {boolean}
 */
var isObjectId = function isObjectId (id) {
	return id && id.hasOwnProperty('_bsontype') && id._bsontype === 'ObjectID';
};

/**
 * @summary Parse group ids from an optional parameter
 * @param groups {string|object|string[]|object[]}
 * @returns {string[]}
 */
var parseGroupIds = function parseGroupIds (groups) {
	// User passed in a single object id
	if (isObjectId(groups)) {
		return [groups];
	}
	// User passed either an array of Object Ids or an array or Group Objects
	if (_.isArray(groups)) {
		 return isObjectId(groups[0]) ? groups : _.map(groups, '_id');
	} else if (_.isObject(groups)) {
		// User passed in a single group
		return [groups._id];
	} else {
		return [];
	}
};

/**
 * @function isAllowedTo
 * @summary Verify a user is allowed to perform an action on a page by checking
 * 					which roles can perform that action
 * @param user {User} User object or Model
 * @param action {string} Action to be performed
 * @param [groups] {string|object|string[]|object[]} Groups contain an _id and roles, see if this group
					can perform the action
 * @returns {boolean}
 */
function isAllowedTo (user, action, groups) {
  var schemes = config.permissions,
			allowedRoles = schemes[action],
			groupIds = parseGroupIds(groups);

	// If the action does not have any declared roles to allow, or
	// this.roles does not exist because someone has an account but is not yet approved, bail
	if (null == allowedRoles || null == user.roles) {
		return false;
	}
	// If they are an admin, they can do anything
	if (user.roles.admin) {
		return true;
	}
	// if allowedRoles is an array, the roles are considered global roles
	if (_.isArray(allowedRoles)) {
		// If the allowed roles contains 'any', then they can perform the action
		if (_.includes(allowedRoles, 'any')) {
			return true;
		}
		// If the user has any of the allowed roles, they can perform this action
		return allowedRoles.some(function (role) { return user.roles[role]; });
	} else {
		// In this case, allowedRoles contains global and group roles
		// If the allowed roles contains 'any', then they can perform the action
		if (_.includes(allowedRoles.global, 'any') || _.includes(allowedRoles.group, 'any')) {
			return true;
		}
		// If we have group ids provided, then we need to check the group roles
		// and the global roles
		if (groupIds.length) {
			// Check if the user belongs to one of the provided groups and has the necessary group role
			// If multiple groups are specified, we should only return true if he can edit all groups
			return groupIds.every(function (id) {
				var userGroup = _.find(user.groups, { _id: id });
				var toReturn = false;
				// Check group roles
				allowedRoles.group.forEach(function (role) {
					if (userGroup && userGroup.roles[role]) { toReturn = true; }
				});
				// Check global roles if they exist, global permissions can be omitted if only admin would be used
				if (allowedRoles.global) {
					allowedRoles.global.forEach(function (role) {
						if (user.roles[role]) { toReturn = true; }
					});
				}
				return toReturn;
			});
		} else {
			// Since no group ids are supplied, just check the global roles if they exist
			// If no global roles exist, then only admins can go by which we alread checked above
			// and make sure to force into boolean so undefined is not returned
			// TODO: Discuss, should we just check against every group the user belongs to
			// if no groups are provided or should that mean they don't have access unless they have
			// appropriate global roles
			return !!(
				allowedRoles.global &&
				allowedRoles.global.some(function (role) { return user.roles[role]; })
			);
		}
	}
}

/**
 * @function getAllowedActions
 * @summary Get a list of all the allowed actions for a particular user
 * @returns {Object}
 */
function getAllowedActions (user) {
  var schemes = config.permissions;
	var actions = Object.keys(schemes);
	var toReturn = {};
	// Check the global permissions
	toReturn.global = _.filter(actions, function (a) { return isAllowedTo(user, a); });
	// Filter actions that have group permissions
	var actionsWithGroups = _.filter(actions, function (a) { return schemes[a].group; });
	// an then check the group permissions
	toReturn.group = _.reduce(user.groups, function (result, group) {
		result[group._id] = _.filter(actionsWithGroups, function (fa) { return isAllowedTo(user, fa, group._id); });
		return result;
	}, {});

	return toReturn;
}

module.exports = {
  isAllowedTo: isAllowedTo,
  getAllowedActions: getAllowedActions
};