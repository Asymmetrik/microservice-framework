'use strict';

/** @module users/tests/user */

/**
 * Module dependencies.
 */
var _ = require('lodash'),
  path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Group = mongoose.model('Group'),
	GroupPermission = mongoose.model('GroupPermission'),
  permissions = require(path.resolve('./config/lib/permissions.js')),
  permissionUtils = require(path.resolve('./app/util/server/models/user-permissions.server.plugin'));
  
/**
 * Globals
 */
var spec = {
	user1: {
		name: 'User 1',
		email: 'user1@mail.com',
		username: 'user1',
		password: 'P@$$word',
		provider: 'local',
		roles: { user: true, admin: true }
	},
  user2: {
		name: 'User 2',
		email: 'user2@mail.com',
		username: 'user2',
		password: 'P@$$word',
		provider: 'local',
		roles: { marketer: true }
	},
  user3: {
		name: 'User 3',
		email: 'user3@mail.com',
		username: 'user3',
		password: 'P@$$word',
		provider: 'local',
		roles: { editor: true, translator: true }
	},
  group1: { title: 'Test One' },
  group2: { title: 'Test Two' },
  group3: { title: 'Test Three' },
  permission1: { roles: { admin: true, editor: true }},
  permission2: { roles: { admin: true }},
  permission3: { roles: { editor: true }}
};

// Initialize Global permissions for testing
permissions.init();

var user1, user2, user3,
    group1, group2, group3,
    permission1, permission2, permission3;

/**
 * Unit tests
 */
describe('User Permission Schemes Unit Tests:', function() {
  
  before(function (done) {
    // Create some users
    user1 = new User(spec.user1);
    user2 = new User(spec.user2);
    user3 = new User(spec.user3);
    // Create some groups
    group1 = new Group(spec.group1);
    group2 = new Group(spec.group2);
    group3 = new Group(spec.group3);
    // Create some permissions for these groups, give them the correct ids first
    spec.permission1._id = group1._id;
    permission1 = new GroupPermission(spec.permission1);
    spec.permission2._id = group2._id;
    permission2 = new GroupPermission(spec.permission2);
    spec.permission3._id = group3._id;
    permission3 = new GroupPermission(spec.permission3);
    // Give our users some groups
    user1.groups = [permission1, permission2, permission3];
    user2.groups = [permission1, permission2];
    done();
  });
  
  // after(function (done) {
  //   // Nothing is saved so I don't think I need to clean anything up
  //   User.remove().exec();
  //   done();
  // });
  
  /* jshint ignore:start */
	describe('Method isAllowedTo', function () {
		
		it('should allow the user to perform an action their roles have access to', function () {
			permissionUtils.isAllowedTo(user1, 'view.project').should.be.true;
			permissionUtils.isAllowedTo(user1, 'create.group').should.be.true;
			permissionUtils.isAllowedTo(user2, 'edit.project').should.be.true;
		});
		
		it('should not allow the user to perform an action their roles do not have access to', function () {
      permissionUtils.isAllowedTo(user2, 'create.group').should.be.false;
			permissionUtils.isAllowedTo(user2, 'edit.group', group3._id).should.be.false;
			permissionUtils.isAllowedTo(user2, 'export.data').should.be.false;
		});
		
		it('should allow the user to create/modify groups if they are a global admin', function () {
			permissionUtils.isAllowedTo(user1, 'create.group').should.be.true;
			permissionUtils.isAllowedTo(user1, 'edit.group').should.be.true;
			permissionUtils.isAllowedTo(user1, 'edit.group', group3._id).should.be.true;
		});
		
		it('should allow the user to modify groups if they are a group admin or editor', function () {
			permissionUtils.isAllowedTo(user2, 'edit.group', group1._id).should.be.true;
			permissionUtils.isAllowedTo(user2, 'edit.group', group2._id).should.be.true;
		});
		
		it('should allow the user to modify groups and support several types for the groups parameter', function () {
			// All of these should work
			// These first two should have the same effect
			permissionUtils.isAllowedTo(user2, 'edit.group', group2._id).should.be.true;
			permissionUtils.isAllowedTo(user2, 'edit.group', group2).should.be.true;
			// These next two should have the same effect
			permissionUtils.isAllowedTo(user1, 'edit.group', [group1._id, group2._id, group3._id]).should.be.true;
			permissionUtils.isAllowedTo(user1, 'edit.group', [group1, group2, group3]).should.be.true;
		});
    
		it('should not allow the user to modify a group if they do not belong to it and are not an admin', function () {
      permissionUtils.isAllowedTo(user3, 'edit.group', group3._id).should.be.false; // he is not part of group 3
			permissionUtils.isAllowedTo(user3, 'edit.group').should.be.false; // he belongs to no groups
		});
    
		it('should return true only if the user can modify all groups supplied as the second argument', function () {
      // User 1 can edit all groups
			permissionUtils.isAllowedTo(user1, 'edit.group', [group1, group2, group3]).should.be.true;
			// User 2 should only be allowed to edit groups 1 & 2, but not 3
			permissionUtils.isAllowedTo(user2, 'edit.group', [group1, group2, group3]).should.be.false;
		});
		
		it('should not allow user to perform any action with no declared roles', function () {
			permissionUtils.isAllowedTo(user1, 'do.stuff').should.be.false;
			permissionUtils.isAllowedTo(user1, 'delete.everything').should.be.false;
		});
		
	});
  
  describe('Method getAllowedActions', function () {
    
    it('should return a JSON object containing group and global lists', function () {
      var allowedActions = permissionUtils.getAllowedActions(user2);
      // console.log('User 1 Permissions:', JSON.stringify(allowedActions, null, '\t'));
      allowedActions.should.have.property('global').and.be.a.Array;
      allowedActions.should.have.property('group');
      // Check that all groups this user has are present and are arrays
      user2.groups.forEach(function (group) {
        allowedActions.group[group._id].should.be.a.Array;
      });
    });
    
    it('should show that an admin can perform every action available', function () {
      var allowedActions = permissionUtils.getAllowedActions(user1);
      var allActions = Object.keys(permissions.get());
      
      allActions.every(function (action) {
        var toReturn = false;
        if (allowedActions.global.indexOf(action) > -1) toReturn = true;
        // Check individual groups
        user1.groups.forEach(function (group) {
          if (allowedActions.group[group._id].indexOf(action) > -1) toReturn = true;
        });
        return toReturn;
      }).should.be.true;
    });
    
    it('should show that a group admin can perform all actions that are specific to groups', function () {
      var allowedActions = permissionUtils.getAllowedActions(user2);
      var permissionsMap = permissions.get();
      // Get a unique list of actions with group permissions specified,
      // this is basically filtering the permissions dictionary to a smaller one
      var groupOnlyActions = _.reduce(permissionsMap, function (result, value, key) {
    		if (value.group) { result[key] = value; }
    		return result;
    	}, {});
      // User 2 is an admin to his groups, so he should be able to perform any action on a group
      Object.keys(groupOnlyActions).every(function (action) {
        return Object.keys(allowedActions.group).every(function (groupId) {
          return allowedActions.group[groupId].indexOf(action) > -1;
        });
      }).should.be.true;
    });
    
  });
  
	/* jshint ignore:end */
  
});