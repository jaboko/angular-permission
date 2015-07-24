describe('Module: Permission', function () {
  'use strict';

  // TODO: Finish this test

  var $rootScope;
  var $state;
  var $stateProvider;
  var $q;
  var PermissionProvider;


  function $get(what) {
    return jasmine.getEnv().currentSpec.$injector.get(what);
  }

  function initStateTo(stateName, optionalParams) {
    var $state = $get('$state'), $rootScope = $get('$rootScope');
    $state.transitionTo(stateName, optionalParams || {});
    $rootScope.$digest();
    expect($state.current.name).toBe(stateName);
  }

  beforeEach(module('ui.router', function (_$stateProvider_) {
    $stateProvider = _$stateProvider_;
  }));

  beforeEach(module('permission', function (_PermissionProvider_) {
    PermissionProvider = _PermissionProvider_;
  }));

  beforeEach(inject(function(_$state_, _$q_, _$rootScope_) {
    $state = _$state_;
    $q = _$q_;
    $rootScope = _$rootScope_;
  }));

  beforeEach(function() {
    PermissionProvider.defineRole('accepted', function() {
      return true;
    });

    PermissionProvider.defineRole('denied', function() {
      return false;
    });

    PermissionProvider.defineRole('withParams', function(params) {
      if(params.isset && angular.isString(params.isset)) {
        return params.isset === 'true';
      }
      else {
        console.log('is withParams: ' + (params.isset === true));
        return params.isset === true;
      }
    });

    PermissionProvider.defineRole('withOtherParams', function(params) {
      if(params.isOther && angular.isString(params.isOther)) {
        return params.isOther === 'true';
      }
      else {
        console.log('is withOtherParams: ' + (params.isOther === true));
        return params.isOther === true;
      }
    });


    $stateProvider.state('home', {});
    $stateProvider.state('redirectToThisState', {});


    $stateProvider.state('accepted', {
      data: {
      permissions: {
        only: ['accepted']
      }
      }
    });

    $stateProvider.state('denied', {
      data: {
      permissions: {
        only: ['denied']
      }
      }
    });

    $stateProvider.state('deniedWithRedirect', {
      data: {
      permissions: {
        only: ['denied'],
        redirectTo: 'redirectToThisState'
      }
      }
    });

    $stateProvider.state('onlyWithParams', {
      url: ':isset',
      data: {
        permissions: {
          only: ['withParams']
        }
      }
    });

    $stateProvider.state('exceptWithParams', {
      url: ':isset',
      data: {
        permissions: {
          except: ['withParams']
        }
      }
    });

    $stateProvider.state('abstractTest', {
      abstract: true,
      url: ':abstractValue'
    });
    $stateProvider.state('abstractTest.redirect', {
      url: '/abstract'
    });
    $stateProvider.state('abstractTest.denied', {
      url: '/denied',
      data: {
        permissions: {
          only: ['denied'],
          redirectTo: 'abstractTest.redirect'
        }
      }
    });

    $stateProvider.state('functionRedirect', {
      url: '/function',
      data: {
        permissions: {
          only: ['denied'],
          redirectTo: function () {
            return 'other';
          }
        }
      }
    });

    $stateProvider.state('functionPromiseRedirect', {
      url: '/function-promise',
      data: {
        permissions: {
          only: ['denied'],
          redirectTo: function () {
            return $q.when('other');
          }
        }
      }
    });

    $stateProvider.state('objectRedirect', {
      url: '/object/:isset',
      data: {
        permissions: {
          except: ['withOtherParams', 'withParams'],
          redirectTo: {
            withOtherParams: 'otherObject',
            withParams: 'other'
          }
        }
      }
    });

    $stateProvider.state('other', {
      url: '/other'
    });

    $stateProvider.state('otherObject', {
      url: '/otherObject'
    });
  });

  xdescribe('On $stateChangeStart', function () {
    it('should go to an accepted state', inject (function($rootScope) {
      initStateTo('home');
      $state.go('accepted');

      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('accepted');
      expect(changePermissionAcceptedHasBeenCalled).toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).not.toBeTruthy();
    }));

    it('should broadcast a $stateChangeStart with correct parameters(accepted state)', inject (function($rootScope) {
      initStateTo('home');
      $state.go('accepted');

      var changeStartHasBeenCalled = false;
      var toState = null;
      var fromState = null;
      $rootScope.$on('$stateChangeStart', function (event, _toState, toParams, _fromState, fromParams) {
        changeStartHasBeenCalled = true;
        toState = _toState;
        fromState = _fromState;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('accepted');
      expect(changeStartHasBeenCalled).toBeTruthy();
      expect(toState.name).toBe('accepted');
      expect(fromState.name).toBe('home');
    }));

    it('should broadcast a $stateChangePermissionStart', inject(function($rootScope) {
      initStateTo('home');

      var changePermissionStartHasBeenCalled = false;
      var toState = null;
      $rootScope.$on('$stateChangePermissionStart', function (event, _toState) {
        changePermissionStartHasBeenCalled = true;
        toState = _toState;
      });

      $state.go('accepted');
      $rootScope.$digest();
      expect(changePermissionStartHasBeenCalled).toBeTruthy();
      expect(toState.name).toBe('accepted');
    }));

    it('should not go to a state when $stateChangePermissionStart has been cancelled', function() {
      initStateTo('home');

      $rootScope.$on('$stateChangePermissionStart', function (event) {
        event.preventDefault();
      });

      $state.go('accepted');
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('home');
      expect(changePermissionAcceptedHasBeenCalled).not.toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).not.toBeTruthy();
    });

    it('should not go to the denied state', function () {
      initStateTo('home');
      $state.go('denied');
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('home');
      expect(changePermissionAcceptedHasBeenCalled).not.toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).toBeTruthy();
    });

    it('should broadcast a $stateChangeStart with correct parameters(denied state)', inject (function($rootScope) {
      initStateTo('home');
      $state.go('denied');

      var changeStartHasBeenCalled = false;
      var toState = null;
      var fromState = null;
      $rootScope.$on('$stateChangeStart', function (event, _toState, toParams, _fromState, fromParams) {
        changeStartHasBeenCalled = true;
        toState = _toState;
        fromState = _fromState;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('home');
      expect(changeStartHasBeenCalled).toBeTruthy();
      expect(toState.name).toBe('denied');
      expect(fromState.name).toBe('home');
    }));

    it('should not go to the denied state but redirect to the provided state', function () {
      initStateTo('home');
      $state.go('deniedWithRedirect');
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });
      $rootScope.$digest();
      expect($state.current.name).toBe('redirectToThisState');
      expect(changePermissionAcceptedHasBeenCalled).not.toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).toBeTruthy();
    });

    it('should trigger $stateChangeSuccess with the redirect state and not the denied one', function () {
      initStateTo('home');
      $state.go('deniedWithRedirect');

      $rootScope.$on('$stateChangeSuccess', function (name, toState) {
        expect(toState.name).not.toBe('deniedWithRedirect');
        expect(toState.name).toBe('redirectToThisState');
      });
      $rootScope.$digest();
    });

    it('should pass state params on redirect', function () {
      initStateTo('home');
      $state.go('abstractTest.denied',{abstractValue: 'test'});
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });
      $rootScope.$digest();
      expect($state.current.name).toBe('abstractTest.redirect');
      expect($state.params.abstractValue).toBe('test');
      expect(changePermissionAcceptedHasBeenCalled).not.toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).toBeTruthy();
    });

    it('should pass state params (only)', function () {
      initStateTo('home');
      $state.go('onlyWithParams',{isset: true});
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('onlyWithParams');
      expect(changePermissionAcceptedHasBeenCalled).toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).not.toBeTruthy();
    });

    it('should pass state params (except)', function () {
      initStateTo('home');
      $state.go('exceptWithParams',{isset: true});
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('home');
      expect(changePermissionAcceptedHasBeenCalled).not.toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).toBeTruthy();
    });

    it('should not go to a accepted state when $stateChangeStart has been cancelled', function () {
      initStateTo('home');

      $rootScope.$on('$stateChangeStart', function (event) {
        event.preventDefault();
      });

      $state.go('accepted');
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('home');
      // neither of them should have been called because the event was aborted manually
      expect(changePermissionAcceptedHasBeenCalled).not.toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).not.toBeTruthy();
    });

    it('should not go to a denied state when $stateChangeStart has been cancelled', function () {
      initStateTo('home');

      $rootScope.$on('$stateChangeStart', function (event) {
        event.preventDefault();
      });

      $state.go('denied');
      var changePermissionAcceptedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionAccepted', function () {
        changePermissionAcceptedHasBeenCalled = true;
      });

      var changePermissionDeniedHasBeenCalled = false;
      $rootScope.$on('$stateChangePermissionDenied', function () {
        changePermissionDeniedHasBeenCalled = true;
      });

      $rootScope.$digest();
      expect($state.current.name).toBe('home');
      // neither of them should have been called because the event was aborted manually
      expect(changePermissionAcceptedHasBeenCalled).not.toBeTruthy();
      expect(changePermissionDeniedHasBeenCalled).not.toBeTruthy();
    });
  });

  xdescribe('#redirectTo function', function () {
    it('should redirect based on function if passed', function () {
      initStateTo('home');

      $state.go('functionRedirect');
      $rootScope.$digest();
      expect($state.current.name).toBe('other');
    });

    it('should redirect with promises as well', function () {
      initStateTo('home');

      $state.go('functionPromiseRedirect');
      $rootScope.$digest();
      expect($state.current.name).toBe('other');
    });
  });

  describe('#redirectTo object', function(){
    xit('should match the second state and redirect accordingly', function() {
      initStateTo('home');

      // this set the state to withParams
      $state.go('objectRedirect', {isset: true, isOther: false});

      $rootScope.$digest();
      expect($state.current.name).toBe('other');
    });

    it('should match the first state and redirect accordingly', function() {
      initStateTo('home');

      // this set the state to withOtherParams
      $state.go('objectRedirect', {isset: false, isOther: true});

      $rootScope.$digest();
      expect($state.current.name).toBe('otherObject');
    });
  });

});
