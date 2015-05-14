/*global angular*/
(function withAngular(angular) {
  'use strict';

  angular.module('bitNFC', [
    'ionic',
    '720kb.fx',
    'bitNFC.filters',
    'bitNFC.providers',
    'bitNFC.factories',
    'bitNFC.controllers'])

  .constant('Config', {
    'currencies': ['EUR', 'BTC', 'RUB', 'YEN', 'US'],
    'denominations': ['BTC', 'SATOSHI', 'mBTC']
  })

  .config(['$stateProvider', '$urlRouterProvider', '$logProvider', '$httpProvider',
    function configurationFunction($stateProvider, $urlRouterProvider, $logProvider, $httpProvider) {

      $logProvider.debugEnabled(true);
      $stateProvider
      .state('app', {
        'url': '/app',
        'abstract': true,
        'templateUrl': 'views/layout/index.html'
      })
      .state('app.home', {
        'url': '/home',
        'views': {
          'appContent': {
            'templateUrl': 'views/home/index.html',
            'controller': 'HomeCtrl'
          }
        }
      })
      .state('app.receive', {
        'url': '/receive/:pvk',
        'views': {
          'appContent': {
            'templateUrl': 'views/receive/index.html',
            'controller': 'ReceiveCtrl'
          }
        }
      })
      .state('app.send', {
        'url': '/send/:nfcAddress',
        'views': {
          'appContent': {
            'templateUrl': 'views/send/index.html',
            'controller': 'SendCtrl'
          }
        }
      });

      $urlRouterProvider.otherwise('/app/home');
      $httpProvider.interceptors.push('CordovaNetworkInterceptor');
  }])

  .run(['$ionicPlatform', '$rootScope', '$window', '$state', '$ionicPopup', 'nfc', 'BitCoin', 'BlockChain',
    function onApplicationStart($ionicPlatform, $rootScope, $window, $state, $ionicPopup, nfc, BitCoin, BlockChain) {

    $rootScope.debugMode = true; //false

    $ionicPlatform.ready(function onReady() {

      if ($window.cordova &&
        $window.cordova.plugins &&
        $window.cordova.plugins.Keyboard) {

        $window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }

      if ($window.StatusBar) {

        $window.StatusBar.styleLightContent();
      }

      $rootScope.$emit('system:started');
    });

    $rootScope.$on('nfc:status-ok', function onNfcStatusOk() {

      $rootScope.nfcStatus = true;
    });

    $rootScope.$on('nfc:status-ko', function onNfcStatusOk(eventsInformations, payload) {

      $rootScope.nfcStatus = false;
      if (payload &&
        payload.error) {

        $ionicPopup.alert({
          'title': 'Oh snap!',
          'template': payload.error
        });
      }
    });

    $rootScope.$on('nfc:status-empty', function onEmptyTag() {

      var privateKey = BitCoin.generatePrivateKey();
      $rootScope.tagAddress = privateKey.toAddress();
      nfc.writeTag($rootScope.tagAddress);

      $ionicPopup.confirm({
        'title': 'An empty NFC tag was found',
        'templateUrl': 'views/popup/empty-tag.html',
        'scope': $rootScope,
        'buttons': [
          {
            'text': 'Cancel'
          },
          {
            'text': 'OK',
            'type': 'button-dark',
            'onTap': function() {

              // FIXME: riempire il valore del field toAddress che attualmente non viene riempito
              $state.go('app.send', {
                'toAddress': $rootScope.tagAddress
              });
            }
          }
        ]
      });
    });

    $rootScope.$on('nfc:status-message', function onMessageTag(eventsInformations, payload) {

      if (payload &&
        payload.privateKey) {

        var tagPrivateKey = BitCoin.fromPrivateKey(payload.privateKey);

        $rootScope.tagAddress = tagPrivateKey.toAddress();
        BlockChain.balance($rootScope.tagAddress).then(function onBalance(tagBalance) {

          $rootScope.tagBalance = tagBalance;
          $ionicPopup.confirm({
            'title': 'NFC Wallet found!',
            'templateUrl': 'views/popup/nfc-wallet.html',
            'scope': $rootScope,
            'buttons': [
              {
                'text': 'Cancel'
              },
              {
                'text': 'OK',
                'type': 'button-dark',
                'onTap': function() {

                  // TODO: BitCoin.sweep(tagPrivateKey).then(function(){

                    $ionicPopup.alert({
                      'title': 'Tag Swept successfully!',
                      'template': 'Your balance is now ...',
                      'buttons': [
                        {
                          'text': 'OK',
                          'type': 'button-dark',
                        }
                      ]
                    });
                  // });

                  // TODO: transition to home view (to show the updated balance)

                }
              }
            ]
          });
        });
      }
    });

    $rootScope.$on('network:offline', function onNetworkOffline() {

      $ionicPopup.confirm({
        'title': 'NETWORK ERROR',
        'templateUrl': 'views/popup/network-down.html'
      }).then(function onUserTouch(res) {

        if (res) {

          $state.go('app.home');
        }
      });
    });
  }]);
}(angular));
