'use strict';

(function () {
    'use strict';

    angular.module('permission')
        .provider('Permission', function () {
            var roleValidationConfig = {};
            var validateRoleDefinitionParams = function (roleName, validationFunction) {
                if (!angular.isString(roleName)) {
                    throw new Error('Role name must be a string');
                }
                if (!angular.isFunction(validationFunction)) {
                    throw new Error('Validation function not provided correctly');
                }
            };

            var validateManyRolesDefinitionParams = function (roles, validationFunction) {
                if (!angular.isArray(roles)) {
                    throw new Error('Roles must be an array');
                } else {
                    for (var i = 0; i < roles.length; i++) {
                        validateRoleDefinitionParams(roles[i], validationFunction);
                    }
                }
            };

            this.defineRole = function (roleName, validationFunction) {
                /**
                 This method is only available in config-time, and cannot access services, as they are
                 not yet injected anywere which makes this kinda useless.
                 Should remove if we cannot find a use for it.
                 **/
                validateRoleDefinitionParams(roleName, validationFunction);
                roleValidationConfig[roleName] = validationFunction;

                return this;
            };

            this.$get = ['$q', function ($q) {
                var Permission = {
                    _promiseify: function (value) {
                        /**
                         Converts a value into a promise, if the value is truthy it resolves it, otherwise
                         it rejects it
                         **/
                        if (value && angular.isFunction(value.then)) {
                            return value;
                        }

                        var deferred = $q.defer();
                        if (value) {
                            deferred.resolve(value);
                        } else {
                            deferred.reject(value);
                        }
                        return deferred.promise;
                    },
                    _validateRoleMap: function (roleMap) {
                        if (typeof(roleMap) !== 'object' || roleMap instanceof Array) {
                            throw new Error('Role map has to be an object');
                        }
                        if (roleMap.only === undefined && roleMap.except === undefined) {
                            throw new Error('Either "only" or "except" keys must me defined');
                        }
                        if (roleMap.only) {
                            if (!(roleMap.only instanceof Array)) {
                                throw new Error('Array of roles expected');
                            }
                        } else if (roleMap.except) {
                            if (!(roleMap.except instanceof Array)) {
                                throw new Error('Array of roles expected');
                            }
                        }
                    },
                    // NOTE questa funzione è ricorsiva
                    // FIXME a mio parare questa funzione incasina le cose
                    _findMatchingRole: function (rolesArray, toParams) {
                        var roles = angular.copy(rolesArray);
                        var deferred = $q.defer();
                        var currentRole = roles.shift();

                        //console.log('============== roles: ', roles);

                        // If no roles left to validate reject promise
                        if (!currentRole) {
                            deferred.reject();
                            return deferred.promise;
                        }
                        // Validate role definition exists
                        if (!angular.isFunction(Permission.roleValidations[currentRole])) {
                            throw new Error('undefined role or invalid role validation');
                        }

                        var validatingRole = Permission.roleValidations[currentRole](toParams, currentRole);

                        // console.log(Permission.roleValidations[currentRole], toParams, currentRole);
                        //console.log('_findMatchingRole: ' + validatingRole, ' for ' + currentRole);
                        validatingRole = Permission._promiseify(validatingRole);

                        validatingRole
                            .then(function (role) {
                                // NOTE role ha valore boolean, devo ritornare il ruolo corrente
                                //console.log('currentRole: ' + currentRole);
                                return deferred.resolve(currentRole);
                            })
                            .catch(function (role) {
                                //console.log('entro nel catch');
                                return Permission._findMatchingRole(roles, toParams);
                            })
                            .then(function (role) {
                                // NOTE qua rimane incastra il ruolo sbagliato
                                //console.log('2nd current: ' + currentRole);
                                return deferred.resolve(role);
                            })
                            .catch(function (role) {
                                console.log(currentRole);
                                return deferred.reject(role);
                            });

                        return deferred.promise;
                    },
                    defineRole: function (roleName, validationFunction) {
                        /**
                         Service-available version of defineRole, the callback passed here lives in the
                         scope where it is defined and therefore can interact with other modules
                         **/
                        validateRoleDefinitionParams(roleName, validationFunction);
                        roleValidationConfig[roleName] = validationFunction;

                        return Permission;
                    },
                    defineManyRoles: function (roles, validationFunction) {
                        validateManyRolesDefinitionParams(roles, validationFunction);

                        var definedPermissions = Permission;
                        for (var i = 0; i < roles.length; i++) {
                            definedPermissions = definedPermissions.defineRole(roles[i], validationFunction);
                        }

                        return definedPermissions;
                    },
                    resolveIfMatch: function (rolesArray, toParams) {
                        var roles = angular.copy(rolesArray);
                        var deferred = $q.defer();
                        Permission._findMatchingRole(roles, toParams).then(function (role) {
                            // Found role match
                            deferred.resolve(role);
                        }, function (role) {
                            // No match
                            deferred.reject(role);
                        });
                        return deferred.promise;
                    },
                    rejectIfMatch: function (roles, toParams) {
                        var deferred = $q.defer();
                        //console.log('rejectIfMatch: ' + roles);
                        Permission._findMatchingRole(roles, toParams)
                            .then(function (role) {
                                // Role found
                                // NOTE reject con il ruolo errato
                                //console.log('reject', role);
                                deferred.reject(role);
                            }, function (role) {
                                // Role not found
                                //console.log('resolve');
                                deferred.resolve(role);
                            });
                        return deferred.promise;
                    },
                    roleValidations: roleValidationConfig,
                    authorize: function (roleMap, toParams) {
                        // Validate input
                        Permission._validateRoleMap(roleMap);

                        var authorizing;

                        if (roleMap.only) {
                            authorizing = Permission.resolveIfMatch(roleMap.only, toParams);
                        } else {
                            authorizing = Permission.rejectIfMatch(roleMap.except, toParams);
                        }

                        return authorizing;
                    }
                };

                return Permission;
            }];
        });

}());
